import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import TicketDetail from "./pages/TicketDetail";
import CreateTicket from "./pages/CreateTicket";
import MyTickets from "./pages/MyTickets";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import { Toaster } from "sonner";
import "./App.css";

function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/dashboard" : "/my-tickets"} replace />;
}

function AppRouter() {
  const location = useLocation();
  // Synchronous detection of session_id fragment (OAuth callback)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tickets" element={<RequireRole role="admin"><Tickets /></RequireRole>} />
        <Route path="/tickets/new" element={<CreateTicket />} />
        <Route path="/tickets/:id" element={<TicketDetail />} />
        <Route path="/my-tickets" element={<MyTickets />} />
        <Route path="/employees" element={<RequireRole role="admin"><Employees /></RequireRole>} />
        <Route path="/departments" element={<RequireRole role="admin"><Departments /></RequireRole>} />
        <Route path="/reports" element={<RequireRole role="admin"><Reports /></RequireRole>} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#FFFFFF",
              border: "1px solid #E5E2DC",
              color: "#1C1C1C",
              fontFamily: "IBM Plex Sans",
              fontSize: 13,
            },
          }}
        />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
