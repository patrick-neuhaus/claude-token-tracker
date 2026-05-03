import { Component, type ReactNode } from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="max-w-lg space-y-4 rounded-lg border border-red-500/30 bg-red-500/10 p-6">
            <h2 className="text-lg font-bold text-red-400">Erro na aplicação</h2>
            <pre className="whitespace-pre-wrap text-sm text-red-300">
              {this.state.error?.message}
            </pre>
            <pre className="whitespace-pre-wrap text-xs text-red-300/60">
              {this.state.error?.stack?.split("\n").slice(0, 5).join("\n")}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-red-500/20 px-4 py-2 text-sm text-red-300 hover:bg-red-500/30"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
