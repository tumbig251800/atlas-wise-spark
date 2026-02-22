import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse-glow h-12 w-12 rounded-full bg-primary/20" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (role === "director") return <Navigate to="/executive" replace />;

  return <Navigate to="/log" replace />;
};

export default Index;
