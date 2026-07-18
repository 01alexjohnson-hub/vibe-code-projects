import React from "react";

/**
 * SpeakEasy wordmark for the Hub sidebar — a small waveform glyph + the
 * product name, set in the app's Plus Jakarta Sans display weight (see
 * `--font-display` in App.css). Replaces the old LocalFlowMark (Wispr-style
 * lockup); the waveform glyph itself is a generic abstraction, not
 * Wispr-specific, so it carries over unchanged under the new name.
 */
const SpeakEasyMark: React.FC<{ className?: string }> = ({
  className = "",
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-logo-primary"
      >
        <rect x="2" y="9" width="3" height="6" rx="1.5" fill="currentColor" />
        <rect x="8" y="5" width="3" height="14" rx="1.5" fill="currentColor" />
        <rect
          x="14"
          y="2"
          width="3"
          height="20"
          rx="1.5"
          fill="currentColor"
          opacity="0.7"
        />
        <rect x="20" y="7" width="3" height="10" rx="1.5" fill="currentColor" />
      </svg>
      {/* eslint-disable-next-line i18next/no-literal-string -- brand name, not translated */}
      <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>SpeakEasy</span>
    </div>
  );
};

export default SpeakEasyMark;
