import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Bhukhara App:', error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#041410',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#d4af37', fontSize: '2rem', marginBottom: '10px' }}>BHUKHARA</h1>
          <p style={{ color: '#e74c3c', fontSize: '1.1rem', marginBottom: '10px' }}>
            A temporary display error occurred.
          </p>
          {this.state.error && (
            <pre style={{
              background: '#111827',
              color: '#f87171',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              textAlign: 'left',
              maxWidth: '90vw',
              maxHeight: '250px',
              overflow: 'auto',
              marginBottom: '20px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.stack || this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => {
              try {
                localStorage.removeItem('BHUKHARA_GAME_SAVE_V1');
              } catch (e) {
                console.warn(e);
              }
              window.location.href = window.location.origin + window.location.pathname;
            }}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              background: '#d4af37',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            RELOAD GAME & RESET CACHE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
