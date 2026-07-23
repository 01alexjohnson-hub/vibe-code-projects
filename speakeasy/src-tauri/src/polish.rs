//! LocalFlow transcript polishing.
//!
//! A transcript passes through this module before it is pasted. Two stages,
//! gated by [`PolishLevel`]:
//!
//! 1. **Deterministic** (`light` and up) — a pure, offline text pass: strip
//!    filler words, collapse repeated words, tidy whitespace and sentence-start
//!    capitalization. No network, no allocation surprises, fully unit-tested.
//! 2. **LLM** (`medium`/`high`) — a local **ollama** pass on top of the
//!    deterministic result for grammar, punctuation and false-start cleanup
//!    (see [`crate::llm_client::polish_via_ollama`]).
//!
//! Degradation is the load-bearing rule: if ollama is unreachable the LLM stage
//! returns the deterministic text. Polishing must **never** block the paste or
//! queue a transcript to send later — that would violate the egress policy.
//!
//! Filler handling is deliberately post-hoc regex, never a decode-time prompt:
//! prompting whisper with "um, uh" makes it hallucinate them (whisper.cpp
//! #2286), so we transcribe cleanly and strip here instead.

use crate::settings::PolishLevel;
use once_cell::sync::Lazy;
use regex::Regex;

/// Standalone filler words (and the multi-word "you know" / "i mean"), matched
/// case-insensitively on word boundaries. An optional immediately-preceding
/// comma is consumed too, so ", uh," collapses cleanly rather than leaving an
/// orphaned comma. "like" is intentionally excluded here — it is a real word and
/// is only treated as a filler in the comma context handled by [`LIKE_FILLER`].
static FILLER: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)(?:,\s*)?\b(?:um+|uh+|uhm+|erm+|hmm+)\b[,.]?").unwrap());

/// "like" only as a filler: it must be wrapped by a following comma (the ",
/// like," verbal tic). "I like pizza" is left untouched.
static LIKE_FILLER: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)(?:,\s*)?\blike\b,").unwrap());

/// The multi-word verbal fillers, handled separately so the single-token
/// [`FILLER`] pattern stays simple.
static PHRASE_FILLER: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?i)(?:,\s*)?\b(?:you know|i mean)\b[,.]?").unwrap());

/// Whitespace sitting directly before punctuation, left behind by removal.
static SPACE_BEFORE_PUNCT: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+([,.!?;:])").unwrap());

/// Two or more spaces collapse to one.
static MULTI_SPACE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s{2,}").unwrap());

/// Doubled-up commas (", ,") that a mid-sentence removal can produce.
static DOUBLE_COMMA: Lazy<Regex> = Lazy::new(|| Regex::new(r",(?:\s*,)+").unwrap());

/// Polish `raw` for the given `level`. `ollama_model` is only consulted for the
/// medium/high LLM pass. Returns the text to paste.
///
/// This is the one entry point the transcription flow calls; it is `async`
/// solely because the LLM pass is. `none` short-circuits with the raw text.
pub async fn polish(
    raw: &str,
    level: PolishLevel,
    ollama_model: &str,
    llm_timeout_ms: u64,
) -> String {
    if matches!(level, PolishLevel::None) {
        return raw.to_string();
    }

    let deterministic = polish_deterministic(raw);

    // The LLM pass only runs for medium/high, and only when there is something
    // to work on — an empty transcript never round-trips to ollama.
    if !level.uses_llm() || deterministic.trim().is_empty() {
        return deterministic;
    }

    // The LLM pass carries a hard per-request timeout (`llm_timeout_ms`) inside
    // the reqwest call — local models on a low-RAM / CPU-only box can take
    // minutes, so this is what keeps the paste from hanging. Timeout, transport
    // error, empty, or an unusable (reasoning-stripped) response all degrade to
    // the deterministic result already in hand — never a retry, never a queue.
    match crate::llm_client::polish_via_ollama(ollama_model, level, &deterministic, llm_timeout_ms)
        .await
    {
        Ok(Some(text)) if !text.trim().is_empty() => text.trim().to_string(),
        _ => deterministic,
    }
}

/// The deterministic (offline) cleanup pass. Pure function — the whole of the
/// `light` level, and the base every LLM level builds on.
pub fn polish_deterministic(raw: &str) -> String {
    if raw.trim().is_empty() {
        return String::new();
    }

    // 1. Strip fillers. Phrase and "like," patterns first so their surrounding
    //    commas are consumed before the single-token pass runs.
    let mut text = PHRASE_FILLER.replace_all(raw, "").into_owned();
    text = LIKE_FILLER.replace_all(&text, "").into_owned();
    text = FILLER.replace_all(&text, "").into_owned();

    // 2. Collapse consecutive repeated words ("the the" -> "the").
    text = collapse_repeated_words(&text);

    // 3. Tidy punctuation/whitespace left behind by removal.
    text = DOUBLE_COMMA.replace_all(&text, ",").into_owned();
    text = SPACE_BEFORE_PUNCT.replace_all(&text, "$1").into_owned();
    text = MULTI_SPACE.replace_all(&text, " ").into_owned();
    // A leading comma/period orphaned by removing a sentence-initial filler.
    let text = text.trim().trim_start_matches([',', '.', ' ']).trim();

    // 4. Repair sentence-start capitalization.
    capitalize_sentences(text)
}

/// Collapse runs of the same word (case-insensitive) down to a single instance,
/// keeping the first occurrence's casing. "No no no way" -> "No way".
///
/// Only alphabetic tokens collapse, so "ha ha" style intentional repeats of
/// punctuation or numbers are untouched. The `regex` crate has no
/// backreferences, so this is done by hand.
fn collapse_repeated_words(text: &str) -> String {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut result: Vec<&str> = Vec::with_capacity(words.len());

    for word in words {
        let is_word = word.chars().all(|c| c.is_alphabetic());
        match result.last() {
            Some(prev) if is_word && prev.eq_ignore_ascii_case(word) => {
                // Skip this duplicate.
            }
            _ => result.push(word),
        }
    }

    result.join(" ")
}

/// Uppercase the first alphabetic character of the string and of each sentence
/// after a `.`/`!`/`?` terminator. Everything else is left exactly as spoken —
/// this only repairs the start-of-sentence case that filler removal disturbs.
fn capitalize_sentences(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut at_sentence_start = true;

    for ch in text.chars() {
        if at_sentence_start && ch.is_alphabetic() {
            out.extend(ch.to_uppercase());
            at_sentence_start = false;
        } else {
            out.push(ch);
            if matches!(ch, '.' | '!' | '?') {
                at_sentence_start = true;
            }
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_fillers_and_repairs_start_case() {
        assert_eq!(
            polish_deterministic("Um, so I think, uh, we should"),
            "So I think we should"
        );
    }

    #[test]
    fn like_only_stripped_with_comma_context() {
        // Verbal-tic "like" (comma-wrapped) is removed...
        assert_eq!(
            polish_deterministic("I was, like, thinking about it"),
            "I was thinking about it"
        );
        // ...but "like" as a real verb is preserved.
        assert_eq!(polish_deterministic("I like pizza"), "I like pizza");
    }

    #[test]
    fn collapses_repeated_words() {
        assert_eq!(polish_deterministic("the the cat sat"), "The cat sat");
        assert_eq!(polish_deterministic("no no no way"), "No way");
        // Two repetitions collapse just like three-plus.
        assert_eq!(polish_deterministic("I I think so"), "I think so");
    }

    #[test]
    fn empty_input_yields_empty() {
        assert_eq!(polish_deterministic(""), "");
        assert_eq!(polish_deterministic("   \t\n "), "");
    }

    #[test]
    fn none_level_is_a_no_op() {
        // Level `none` must not touch the raw transcript at all.
        let raw = "Um, hello   there";
        let out = tauri::async_runtime::block_on(polish(raw, PolishLevel::None, "qwen3:4b", 5000));
        assert_eq!(out, raw);
    }

    #[test]
    fn light_level_runs_deterministic_only() {
        // `light` never reaches ollama, so this is offline and deterministic.
        let out = tauri::async_runtime::block_on(polish(
            "Um, so like, we should ship it",
            PolishLevel::Light,
            "qwen3:4b",
            5000,
        ));
        assert_eq!(out, "So we should ship it");
    }

    #[test]
    fn handles_mixed_case_fillers() {
        assert_eq!(polish_deterministic("UM, okay THEN"), "Okay THEN");
        assert_eq!(
            polish_deterministic("So UHM this is UH a test"),
            "So this is a test"
        );
    }

    #[test]
    fn repairs_capitalization_after_sentence_boundary() {
        // Filler removed at the start of the second sentence -> next word must be
        // recapitalized, and the first word of the whole string too.
        assert_eq!(
            polish_deterministic("hello there. um, world is nice"),
            "Hello there. World is nice"
        );
    }

    #[test]
    fn preserves_a_clean_sentence() {
        assert_eq!(
            polish_deterministic("This is a completely normal sentence."),
            "This is a completely normal sentence."
        );
    }

    #[test]
    fn strips_multiword_fillers() {
        assert_eq!(
            polish_deterministic("So, you know, we could, i mean, try it"),
            "So we could try it"
        );
    }
}
