import { Component, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
  /** Optional route name for error message context */
  routeName?: string;
}

/**
 * RouteErrorBoundary — B7.8 (P3.4 react-patterns)
 *
 * Per-route error isolation. Crash em DashboardPage não derruba SettingsPage.
 * Wraps each <Route> element in App.tsx so failures stay scoped.
 *
 * Differs from app-level <ErrorBoundary>: shows inline (within layout) and
 * offers navigation back to /dashboard instead of full reload.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const routeLabel = this.props.routeName ? ` em ${this.props.routeName}` : "";
      return (
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-lg space-y-4 rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-bold text-red-400">Erro nesta tela{routeLabel}</h2>
            <pre className="whitespace-pre-wrap text-sm text-red-300">
              {this.state.error?.message}
            </pre>
            <pre className="whitespace-pre-wrap text-xs text-red-300/60">
              {this.state.error?.stack?.split("\n").slice(0, 5).join("\n")}
            </pre>
            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
              >
                Tentar novamente
              </button>
              <Link
                to="/dashboard"
                onClick={this.handleReset}
                className="rounded bg-muted px-4 py-2 text-sm text-muted-foreground hover:bg-muted/70"
              >
                Voltar pro dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
