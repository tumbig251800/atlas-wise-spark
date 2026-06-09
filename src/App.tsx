import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteFallback } from "@/components/RouteFallback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const TeachingLog = lazy(() => import("./pages/TeachingLog"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Executive = lazy(() => import("./pages/Executive"));
const UploadCSV = lazy(() => import("./pages/UploadCSV"));
const UnitScorePage = lazy(() => import("./pages/UnitScorePage"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const History = lazy(() => import("./pages/History"));
const LessonPlan = lazy(() => import("./pages/LessonPlan"));
const LessonPlanHistory = lazy(() => import("./pages/LessonPlanHistory"));
const SmartReportView = lazy(() => import("./pages/SmartReportView"));
const CompetencyReport = lazy(() => import("./pages/CompetencyReport"));
const Consultant = lazy(() => import("./pages/Consultant"));
const Launch = lazy(() => import("./pages/Launch"));
const ActionBoard = lazy(() => import("./pages/ActionBoard"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/launch" element={<Launch />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/log"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <TeachingLog />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={["director", "lead"]}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/executive"
                element={
                  <ProtectedRoute allowedRoles={["director", "lead"]}>
                    <Executive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/action-board"
                element={
                  <ProtectedRoute allowedRoles={["director", "lead"]}>
                    <ActionBoard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <UploadCSV />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/unit-scores"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <UnitScorePage />
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
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <History />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/lesson-plan"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <LessonPlan />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/lesson-plans"
                element={
                  <ProtectedRoute allowedRoles={["director", "lead"]}>
                    <LessonPlanHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/smart-report"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <SmartReportView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competency-report"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <CompetencyReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/consultant"
                element={
                  <ProtectedRoute allowedRoles={["teacher", "director", "lead"]}>
                    <Consultant />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
