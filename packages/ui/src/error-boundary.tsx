"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Props for the ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Optional custom fallback renderer. Receives the error and reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional custom error handler called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Internal state for the ErrorBoundary component.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches rendering errors in child components.
 *
 * Features:
 * - Automatically reports errors to Sentry with React component stack
 * - Provides a default styled error UI with retry capability
 * - Supports custom fallback UI via render prop
 * - Supports custom error handlers via onError prop
 * - Can be reset programmatically to retry rendering
 *
 * @example
 * ```tsx
 * // Basic usage with default error UI
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // Custom fallback UI
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <div>
 *       <h2>Oops! {error.message}</h2>
 *       <button onClick={reset}>Retry</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom error handler
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error("Custom error handling:", error);
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state when an error is caught.
   * This is called during the render phase, so side effects are not allowed.
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Log error to Sentry and call custom error handler if provided.
   * This is called during the commit phase, so side effects are allowed.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Capture to Sentry with React component stack
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset the error boundary state to retry rendering.
   * This is provided to both custom and default fallback UIs.
   */
  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI with Tailwind styling
      return (
        <div className="flex min-h-[200px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
            <div className="flex flex-col space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900">
                    Something went wrong
                  </h3>
                  <p className="mt-2 text-sm text-red-700">
                    {this.state.error.message || "An unexpected error occurred"}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={this.reset}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
