import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Home from "./pages/Home";
import PublicLayout from "./components/layout/PublicLayout";
import Dashboard from "./pages/Dashboard";
import PrivacyPolicy from "./pages/policies/PrivacyPolicy";
import TOSPolicy from "./pages/policies/TOSPolicy";
import RefundsPolicy from "./pages/policies/RefundsPolicy";
import { AuthProvider } from "./context/AuthContext";
import { queryClient } from "./lib/queryClient";

const App = () => {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" offset={10} />
          <AuthProvider>
            <Router>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={
                  <PublicLayout><Home /></PublicLayout>
                } />
                <Route path="/auth/login" element={
                  <PublicLayout><Login /></PublicLayout>
                } />
                <Route path="/auth/register" element={
                  <PublicLayout><Register /></PublicLayout>
                } />
                <Route path="/policies/privacy" element={
                  <PublicLayout><PrivacyPolicy /></PublicLayout>
                } />
                <Route path="/policies/tos" element={
                  <PublicLayout><TOSPolicy /></PublicLayout>
                } />
                <Route path="/policies/refunds" element={
                  <PublicLayout><RefundsPolicy /></PublicLayout>
                } />

                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <Dashboard />
                } />

                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;