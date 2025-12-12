import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Subscriptions from "./pages/Subscriptions";
import Payments from "./pages/Payments";
import Invoices from "./pages/Invoices";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import ClientLogin from "./pages/ClientLogin";
import Checkout from "./pages/Checkout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ClientAuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Admin Routes */}
              <Route path="/" element={<Login />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
              <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Client Routes - Isolated Checkout */}
              <Route path="/cliente" element={<ClientLogin />} />
              <Route path="/checkout" element={<Checkout />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ClientAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;