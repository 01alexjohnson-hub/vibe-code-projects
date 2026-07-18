import React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/Button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  /** React's component-stack (which component tree caught the throw) —
   * captured in componentDidCatch since getDerivedStateFromError only
   * receives the error itself, not the info object. */
  componentStack: string | null;
}

// A crash screen showing 40 lines of stack is worse than useless — this is
// a snippet for "what broke," full detail is in the console/log file
// (componentDidCatch already logs the untruncated stack there).
const STACK_SNIPPET_LINES = 6;

/**
 * Presentational fallback, split out from the class boundary below so it can
 * use the `useTranslation` hook (error boundaries themselves must be class
 * components — React has no hook equivalent for componentDidCatch).
 */
const ErrorFallback: React.FC<{ error: Error; componentStack: string | null }> = ({
  error,
  componentStack,
}) => {
  const { t } = useTranslation();
  // Prefer the raw JS stack (file/line, the more familiar crash-report
  // shape); fall back to React's component-stack if the thrown value didn't
  // have one (e.g. a plain string was thrown).
  const stackSnippet = (error.stack ?? componentStack ?? "")
    .split("\n")
    .slice(0, STACK_SNIPPET_LINES)
    .join("\n")
    .trim();

  return (
    <div className="h-full w-full flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center gap-3 text-center rounded-lg border border-mid-gray/20 bg-background p-6">
        <AlertTriangle
          size={24}
          className="text-accent-orange shrink-0"
          aria-hidden="true"
        />
        <h2 className="text-base font-semibold">{t("errors.boundary.title")}</h2>
        <p className="text-sm text-text/70">{t("errors.boundary.body")}</p>
        {error.message && (
          <p className="text-xs font-mono text-text/50 break-words">
            {error.message}
          </p>
        )}
        {stackSnippet && (
          <pre className="w-full max-h-32 overflow-y-auto text-start text-[11px] leading-relaxed font-mono text-text/40 bg-[var(--color-log-surface)] border border-mid-gray/15 rounded-md p-2 whitespace-pre-wrap break-words">
            {stackSnippet}
          </pre>
        )}
        <Button
          variant="primary"
          size="md"
          onClick={() => window.location.reload()}
        >
          {t("errors.boundary.reload")}
        </Button>
      </div>
    </div>
  );
};

/**
 * Wraps the whole app (onboarding steps and the Hub, see App.tsx) so a
 * render-time crash anywhere (e.g. malformed settings data, a bad history
 * entry) shows a recoverable error screen instead of unmounting to a blank
 * window. Does not catch errors from event handlers, async code, or effects
 * — those already have their own try/catch + toast handling throughout the
 * app (see App.tsx's listeners).
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("SpeakEasy crashed:", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
