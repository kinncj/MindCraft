import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from '../game/gameStore';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * The last line of defense: a React render error shows a friendly
 * reload card instead of a blank page. The world autosaves, so nothing
 * is lost.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      useGameStore.getState().recordError('react', `${error.message}\n${info.componentStack ?? ''}`);
    } catch {
      // The store itself may be the problem; the card still shows.
    }
    console.error('[MindCraft] screen error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="loading-screen" role="alert">
        <h1>Oops!</h1>
        <p>Something went wrong on the screen. Your world is saved.</p>
        <button type="button" className="kid-button kid-button-primary" onClick={() => location.reload()}>
          🔄 Reload the game
        </button>
        <p className="menu-footer">{this.state.error.message}</p>
      </div>
    );
  }
}

/** Window-level errors and unhandled promise rejections land in the debug list. */
export function installGlobalErrorLog(): void {
  window.addEventListener('error', (event) => {
    useGameStore.getState().recordError('window', `${event.message} (${event.filename}:${event.lineno})`);
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    useGameStore.getState().recordError('promise', reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}` : String(reason));
  });
}
