import React from "react";

type State = { error: Error | null };
export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8">
          <h2 className="font-serif text-xl text-error mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-text-secondary">{this.state.error.message}</p>
          <button className="mt-4 text-sm underline" onClick={() => this.setState({ error: null })}>Réessayer</button>
        </div>
      );
    }
    return this.props.children;
  }
}
