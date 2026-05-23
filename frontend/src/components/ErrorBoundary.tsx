import { Component, ErrorInfo, ReactNode } from 'react';
import i18n from '@/i18n';
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      errorMessage: error?.message || 'Unknown runtime error',
      errorStack: errorInfo?.componentStack || error?.stack || ''
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>{i18n.t('errorBoundary.title')}</h1>
          <p>{i18n.t('errorBoundary.message')}</p>
          {this.state.errorMessage && (
            <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
              {this.state.errorMessage}
            </pre>
          )}
          {this.state.errorStack && (
            <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', textAlign: 'left', maxHeight: 260, overflow: 'auto' }}>
              {this.state.errorStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;