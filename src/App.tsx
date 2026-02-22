import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import TeachingLog from "./pages/TeachingLog";
import Dashboard from "./pages/Dashboard";
import Executive from "./pages/Executive";
import UploadCSV from "./pages/UploadCSV";
import Consultant from "./pages/Consultant";
import AdminSettings from "./pages/AdminSettings";
import History from "./pages/History";
import LessonPlan from "./pages/LessonPlan";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/log"
              element={
                <ProtectedRoute allowedRoles={["teacher", "director"]}>
                  <TeachingLog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["director"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/executive"
              element={
                <ProtectedRoute allowedRoles={["director"]}>
                  <Executive />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload"
              element={
                <ProtectedRoute allowedRoles={["teacher", "director"]}>
                  <UploadCSV />
                </ProtectedRoute>
              }
            />
            <Route
              path="/consultant"
              element={
                <ProtectedRoute allowedRoles={["teacher", "director"]}>
                  <Consultant />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["director"]}>
                  <AdminSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute allowedRoles={["teacher", "director"]}>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lesson-plan"
              element={
                <ProtectedRoute allowedRoles={["teacher", "director"]}>
                  <LessonPlan />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
