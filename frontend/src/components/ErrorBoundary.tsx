"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="error_boundary_container">
          <div className="error_content glass_panel">
            <div className="error_icon">
              <ShieldAlert size={48} />
            </div>
            <h2>System Interruption</h2>
            <p>A kernel-level error has occurred in the interface. Your session is safe, but the current view needs to be reloaded.</p>
            <div className="error_details">
              <code>{this.state.error?.message}</code>
            </div>
            <button className="glass-btn primary" onClick={this.handleReset}>
              <RefreshCw size={16} /> RECOVER INTERFACE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
