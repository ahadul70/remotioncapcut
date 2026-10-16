import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { EditorApp } from "./editor/EditorApp";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("RootErrorBoundary caught rendering error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "32px",
            backgroundColor: "#111214",
            color: "#f3f4f6",
            fontFamily: "sans-serif",
            minHeight: "100vh",
            boxSizing: "border-box",
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <h2 style={{ color: "#f87171", marginBottom: "12px", fontSize: "20px" }}>
              Something went wrong while rendering the editor
            </h2>
            <p style={{ color: "#9ca3af", marginBottom: "16px", fontSize: "14px" }}>
              An unexpected error occurred. Click the button below to reload the editor.
            </p>
            <pre
              style={{
                backgroundColor: "#1f2937",
                padding: "16px",
                borderRadius: "6px",
                color: "#fca5a5",
                fontSize: "13px",
                overflowX: "auto",
                border: "1px solid #374151",
              }}
            >
              {this.state.error?.toString()}
            </pre>
            {this.state.errorInfo?.componentStack && (
              <pre
                style={{
                  backgroundColor: "#18191d",
                  padding: "12px",
                  borderRadius: "6px",
                  color: "#9ca3af",
                  fontSize: "11px",
                  overflowX: "auto",
                  marginTop: "12px",
                  maxHeight: "200px",
                  border: "1px solid #27272a",
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                backgroundColor: "#8b7cff",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "14px",
              }}
            >
              Reload Editor
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <EditorApp />
      </RootErrorBoundary>
    </React.StrictMode>
  );
}
