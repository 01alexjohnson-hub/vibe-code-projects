//! Opt-in **hold-spacebar-to-dictate** mode.
//!
//! Off by default. When enabled, a global `rdev::grab` event tap watches the
//! spacebar and turns a *hold* into a push-to-talk recording, while a quick
//! *tap* still types a normal space. This is deliberately advanced/opt-in: it
//! suppresses the space key, which is unsafe in password/secure-input fields and
//! can interfere with fast typing (see the limitations below), so the UI gates
//! it behind a warning.
//!
//! ## How the tap-vs-hold decision works
//! `rdev::grab`'s callback must decide *synchronously* whether to swallow each
//! event, so the "is this a hold?" delay can't happen inside it. Instead:
//! - **space down**: suppress it, remember the press, and arm a timer thread. If
//!   the key is still held when the timer fires (`spacebar_hold_threshold_ms`),
//!   recording starts.
//! - **space up before the threshold**: it was a tap — we replay a real space
//!   via `rdev::simulate` so the user gets their keystroke.
//! - **space up after recording started**: stop and transcribe.
//! Key-repeat `KeyPress` events while held are coalesced (suppressed, ignored).
//!
//! ## Honest limitations (macOS)
//! - **Secure input**: when a password field has secure input enabled we do NOT
//!   grab the space (it passes straight through) — better to skip PTT than to eat
//!   a space silently.
//! - **Fast typing**: because a tapped space is re-emitted on *key-up*, a very
//!   fast typist can see spaces land slightly late or out of order relative to
//!   surrounding keys. This is the fundamental cost of the tap-vs-hold trick and
//!   is why spacebar mode is not the default.
//! - **Coexistence / permissions**: this adds a second `CGEventTap` alongside the
//!   normal hotkey backend and needs the Input-Monitoring permission. It has not
//!   been exercised on-device in this build — validate before trusting it.
//! - Linux is unsupported here (its `rdev` grab lifecycle differs); `apply` is a
//!   no-op there and the normal hotkey continues to work.

use log::{debug, error, info, warn};
use once_cell::sync::OnceCell;
use std::sync::atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// Process-wide singleton, created on the first `apply` call (it needs the
/// `AppHandle`). `rdev`'s grab tap is itself a global, so a single instance is
/// the right model.
static INNER: OnceCell<Arc<Inner>> = OnceCell::new();

struct Inner {
    app: AppHandle,
    /// Mirrors the `spacebar_ptt` setting; the tap is a pass-through no-op when
    /// false, and the timer refuses to start recording.
    enabled: AtomicBool,
    /// `spacebar_hold_threshold_ms`.
    threshold_ms: AtomicU64,
    /// True between a grabbed space-down and its matching space-up.
    space_down: AtomicBool,
    /// True once the hold crossed the threshold and recording began.
    recording: AtomicBool,
    /// Bumped on every space-down/up so a stale threshold timer from an earlier
    /// press can detect it was superseded and do nothing.
    press_gen: AtomicU64,
    /// Count of synthetic space events (from our own tap-replay) still expected
    /// to re-enter the callback; those must pass through untouched.
    synthetic_pending: AtomicUsize,
    /// Whether the grab thread is currently running.
    grab_running: AtomicBool,
}

/// Apply the current `spacebar_ptt` / `spacebar_hold_threshold_ms` settings:
/// start the grab tap when enabled, stop it when disabled. Safe to call
/// repeatedly (on startup and whenever the settings change).
pub fn apply(app: &AppHandle, enabled: bool, threshold_ms: u64) {
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        let inner = INNER.get_or_init(|| {
            Arc::new(Inner {
                app: app.clone(),
                enabled: AtomicBool::new(false),
                threshold_ms: AtomicU64::new(threshold_ms),
                space_down: AtomicBool::new(false),
                recording: AtomicBool::new(false),
                press_gen: AtomicU64::new(0),
                synthetic_pending: AtomicUsize::new(0),
                grab_running: AtomicBool::new(false),
            })
        });
        inner.threshold_ms.store(threshold_ms, Ordering::Release);
        inner.enabled.store(enabled, Ordering::Release);
        if enabled {
            Arc::clone(inner).start_grab();
        } else {
            inner.stop_grab();
        }
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app, threshold_ms);
        if enabled {
            warn!("Spacebar push-to-talk is not supported on this platform; ignoring");
        }
    }
}

#[cfg(any(target_os = "macos", target_os = "windows"))]
impl Inner {
    /// Spawn the blocking `rdev::grab` loop on its own thread (idempotent).
    fn start_grab(self: Arc<Self>) {
        // Claim the running slot; if it was already set, a tap is live.
        if self.grab_running.swap(true, Ordering::AcqRel) {
            return;
        }
        info!("Starting spacebar push-to-talk grab tap");
        let inner = self;
        std::thread::spawn(move || {
            let cb_inner = Arc::clone(&inner);
            // `grab` blocks in a run loop until `exit_grab` is called.
            if let Err(e) = rdev::grab(move |event| cb_inner.callback(event)) {
                error!("Spacebar grab tap failed to start: {:?}", e);
            }
            inner.grab_running.store(false, Ordering::Release);
            debug!("Spacebar grab tap loop exited");
        });
    }

    /// Stop the grab loop if running.
    fn stop_grab(&self) {
        if self.grab_running.load(Ordering::Acquire) {
            info!("Stopping spacebar push-to-talk grab tap");
            if let Err(e) = rdev::exit_grab() {
                error!("Failed to stop spacebar grab tap: {:?}", e);
            }
        }
    }

    /// The grab callback. Returns `Some(event)` to let the event through and
    /// `None` to suppress it. Must be quick and non-blocking.
    fn callback(self: &Arc<Self>, event: rdev::Event) -> Option<rdev::Event> {
        let suppress = match event.event_type {
            rdev::EventType::KeyPress(rdev::Key::Space) => self.on_space_down(),
            rdev::EventType::KeyRelease(rdev::Key::Space) => self.on_space_up(),
            _ => false,
        };
        if suppress {
            None
        } else {
            Some(event)
        }
    }

    /// Returns true to suppress the space-down.
    fn on_space_down(self: &Arc<Self>) -> bool {
        if !self.enabled.load(Ordering::Acquire) {
            return false;
        }
        // Our own replayed keystrokes must pass through untouched.
        if self.synthetic_pending.load(Ordering::Acquire) > 0 {
            self.synthetic_pending.fetch_sub(1, Ordering::AcqRel);
            return false;
        }
        // Never eat a space in a secure-input (password) field.
        if is_secure_input_active() {
            return false;
        }
        // Auto-repeat while already held: coalesce (suppress, no new hold).
        if self.space_down.swap(true, Ordering::AcqRel) {
            return true;
        }

        self.recording.store(false, Ordering::Release);
        let generation = self.press_gen.fetch_add(1, Ordering::AcqRel) + 1;
        let threshold = self.threshold_ms.load(Ordering::Acquire);
        let inner = Arc::clone(self);
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(threshold));
            // Only start if this exact press is still held and still enabled.
            if inner.enabled.load(Ordering::Acquire)
                && inner.press_gen.load(Ordering::Acquire) == generation
                && inner.space_down.load(Ordering::Acquire)
                && !inner.recording.swap(true, Ordering::AcqRel)
            {
                inner.start_recording();
            }
        });
        true
    }

    /// Returns true to suppress the space-up.
    fn on_space_up(self: &Arc<Self>) -> bool {
        if !self.enabled.load(Ordering::Acquire) {
            return false;
        }
        if self.synthetic_pending.load(Ordering::Acquire) > 0 {
            self.synthetic_pending.fetch_sub(1, Ordering::AcqRel);
            return false;
        }
        // If we weren't tracking this press (e.g. it started in a secure field),
        // let the release through.
        if !self.space_down.swap(false, Ordering::AcqRel) {
            return false;
        }
        // Invalidate any pending threshold timer for this press.
        self.press_gen.fetch_add(1, Ordering::AcqRel);

        if self.recording.swap(false, Ordering::AcqRel) {
            // A real hold: stop recording and transcribe.
            self.stop_recording();
        } else {
            // A quick tap under the threshold: the user meant to type a space, so
            // replay a genuine one.
            self.replay_space();
        }
        true
    }

    fn start_recording(&self) {
        debug!("Spacebar hold crossed threshold — starting recording");
        self.drive_transcribe(true);
    }

    fn stop_recording(&self) {
        debug!("Spacebar released — stopping recording");
        self.drive_transcribe(false);
    }

    /// Drive the normal transcribe pipeline as a push-to-talk event. `push_to_talk`
    /// is forced true so a hold always maps to press-start / release-stop,
    /// independent of the global toggle-mode setting.
    fn drive_transcribe(&self, is_pressed: bool) {
        if let Some(coordinator) = self.app.try_state::<crate::TranscriptionCoordinator>() {
            coordinator.send_input("transcribe", "space", is_pressed, true);
        } else {
            warn!("TranscriptionCoordinator not initialized; spacebar event dropped");
        }
    }

    /// Inject a real space keystroke (down+up). The two synthetic events will
    /// re-enter our tap; `synthetic_pending` lets them pass straight through.
    fn replay_space(self: &Arc<Self>) {
        self.synthetic_pending.fetch_add(2, Ordering::AcqRel);
        let inner = Arc::clone(self);
        std::thread::spawn(move || {
            if let Err(e) = rdev::simulate(&rdev::EventType::KeyPress(rdev::Key::Space)) {
                error!("Failed to replay space keydown: {:?}", e);
                inner.synthetic_pending.fetch_sub(2, Ordering::AcqRel);
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(2));
            if let Err(e) = rdev::simulate(&rdev::EventType::KeyRelease(rdev::Key::Space)) {
                error!("Failed to replay space keyup: {:?}", e);
                // The keydown already re-entered and decremented one; drop the
                // remaining expected keyup so the counter doesn't leak.
                inner.synthetic_pending.fetch_sub(1, Ordering::AcqRel);
            }
        });
    }
}

/// Whether macOS secure event input is currently enabled (a password field has
/// focus). We never grab the spacebar in that state. Always false off macOS.
#[cfg(target_os = "macos")]
fn is_secure_input_active() -> bool {
    #[link(name = "Carbon", kind = "framework")]
    extern "C" {
        fn IsSecureEventInputEnabled() -> u8;
    }
    unsafe { IsSecureEventInputEnabled() != 0 }
}

#[cfg(not(target_os = "macos"))]
fn is_secure_input_active() -> bool {
    false
}
