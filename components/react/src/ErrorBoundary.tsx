import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "./Button.js";
import { Alert } from "./feedback.js";
import { errorMessage } from "./format.js";

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** Shown instead of the subtree that threw. A function gets the error and a `reset`
   *  that renders the subtree again. Default: a danger Alert with the message and
   *  "Try again". */
  fallback?: ReactNode | ((error: unknown, reset: () => void) => ReactNode);
  /** Report the error: log it, send it somewhere. */
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  failed: boolean;
  error: unknown;
}

/** Catches a render error below it so one broken view does not blank the app. To clear it
 *  on navigation, key it by the route: `<ErrorBoundary key={route.path}>`. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false, error: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { failed: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ failed: false, error: undefined });

  render() {
    const { children, fallback } = this.props;
    if (!this.state.failed) return children;
    if (typeof fallback === "function") return fallback(this.state.error, this.reset);
    if (fallback !== undefined) return fallback;
    return (
      <Alert variant="danger" title="Something went wrong">
        {errorMessage(this.state.error, "This part of the page failed to load.")}{" "}
        <Button size="sm" onClick={this.reset}>
          Try again
        </Button>
      </Alert>
    );
  }
}
