import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteFallback } from "@/components/RouteFallback";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const TeachingLog = lazy(() => import("./pages/TeachingLog"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Executive = lazy(() => import("./pages/Executive"));
const UploadCSV = lazy(() => import("./pages/UploadCSV"));
const Consultant = lazy(() => import("./pages/Consultant"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const History = lazy(() => import("./pages/History"));
const LessonPlan = lazy(() => import("./pages/LessonPlan"));
const SmartReportView = lazy(() => import("./pages/SmartReportView"));
const CompetencyReport = lazy(() => import("./pages/CompetencyReport"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
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
              <Route
                path="/smart-report"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director"]}>
                    <SmartReportView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competency-report"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director"]}>
                    <CompetencyReport />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
