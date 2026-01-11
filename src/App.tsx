import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientAuthProvider } from "@/contexts/ClientAuthContext";
import { AffiliateAuthProvider } from "@/contexts/AffiliateAuthContext";
import { GlobalDataProvider } from "@/contexts/GlobalDataContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Subscriptions from "./pages/Subscriptions";
import Payments from "./pages/Payments";
import Invoices from "./pages/Invoices";
import Notifications from "./pages/Notifications";
import Contracts from "./pages/Contracts";
import Referrals from "./pages/Referrals";
import Affiliates from "./pages/Affiliates";
import ReferralLanding from "./pages/ReferralLanding";

import ClientLogin from "./pages/ClientLogin";
import Checkout from "./pages/Checkout";

import AffiliateLogin from "./pages/AffiliateLogin";
import AffiliateRegister from "./pages/AffiliateRegister";
import AffiliateDashboard from "./pages/AffiliateDashboard";
import AffiliateLanding from "./pages/AffiliateLanding";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ClientAuthProvider>
          <AffiliateAuthProvider>
            <GlobalDataProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Admin Routes */}
                  <Route path="/" element={<Login />} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                  <Route path="/clients/:id" element={<ProtectedRoute><ClientProfile /></ProtectedRoute>} />
                  <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
                  <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                  <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                  <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                  <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
                  <Route path="/affiliates" element={<ProtectedRoute><Affiliates /></ProtectedRoute>} />
                  
                  {/* Referral Landing Page (Public) - Clients */}
                  <Route path="/r/:slug" element={<ReferralLanding />} />
                  
                  {/* Client Routes */}
                  <Route path="/cliente" element={<ClientLogin />} />
                  <Route path="/checkout" element={<Checkout />} />
                  
                  {/* Affiliate Routes */}
                  <Route path="/afiliados" element={<AffiliateLogin />} />
                  <Route path="/afiliados/login" element={<AffiliateLogin />} />
                  <Route path="/afiliados/cadastro" element={<AffiliateRegister />} />
                  <Route path="/afiliados/dashboard" element={<AffiliateDashboard />} />
                  <Route path="/a/:slug" element={<AffiliateLanding />} />
                  
                  {/* Legacy routes - redirect to new */}
                  <Route path="/afiliado" element={<AffiliateLogin />} />
                  <Route path="/afiliado/cadastro" element={<AffiliateRegister />} />
                  <Route path="/afiliado/dashboard" element={<AffiliateDashboard />} />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </GlobalDataProvider>
          </AffiliateAuthProvider>
        </ClientAuthProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;