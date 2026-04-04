import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center space-y-4">
            <p className="text-2xl">⚠️</p>
            <h2 className="text-lg font-semibold text-destructive">เกิดข้อผิดพลาดที่ไม่คาดคิด</h2>
            <p className="text-sm text-muted-foreground">
              ระบบพบปัญหาบางอย่าง กรุณาโหลดหน้าใหม่ ถ้าปัญหายังคงอยู่ให้ติดต่อผู้ดูแลระบบ
            </p>
            {this.state.error && (
              <p className="rounded bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              โหลดหน้าใหม่
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
