import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

// Pages
import Landing from "@/pages/Landing";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import BrowseTools from "@/pages/customer/BrowseTools";
import ToolDetails from "@/pages/customer/ToolDetails";
import MyRentals from "@/pages/customer/MyRentals";
import ShopDashboard from "@/pages/shop/ShopDashboard";
import ShopTools from "@/pages/shop/ShopTools";
import QRScanner from "@/pages/worker/QRScanner";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminApp from "@/pages/admin/AdminApp";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import ShopSms from "@/pages/shop/ShopSms";
import WalletPage from "@/pages/wallet/Wallet";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Yuklanmoqda...</div>;
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case "super_admin": return <Redirect to="/admin" />;
      case "shop_owner": return <Redirect to="/shop" />;
      case "worker": return <Redirect to="/worker" />;
      case "customer": return <Redirect to="/browse" />;
      default: return <Redirect to="/" />;
    }
  }

  return <Component />;
}

function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;
  if (!isAuthenticated) return <Landing />;
  
  switch (user?.role) {
    case "super_admin": return <Redirect to="/admin" />;
    case "shop_owner": return <Redirect to="/shop" />;
    case "worker": return <Redirect to="/worker" />;
    case "customer": return <Redirect to="/browse" />;
    default: return <Landing />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Mijoz yo'llari */}
      <Route path="/browse">
        {() => <ProtectedRoute component={BrowseTools} allowedRoles={['customer']} />}
      </Route>
      <Route path="/tools/:id">
        {() => <ProtectedRoute component={ToolDetails} allowedRoles={['customer']} />}
      </Route>
      <Route path="/my-rentals">
        {() => <ProtectedRoute component={MyRentals} allowedRoles={['customer']} />}
      </Route>

      {/* Do'kon egasi yo'llari */}
      <Route path="/shop">
        {() => <ProtectedRoute component={ShopDashboard} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/tools">
        {() => <ProtectedRoute component={ShopTools} allowedRoles={['shop_owner']} />}
      </Route>

      {/* Hodim yo'llari */}
      <Route path="/worker">
        {() => <ProtectedRoute component={QRScanner} allowedRoles={['worker', 'shop_owner']} />}
      </Route>

      {/* Admin yo'llari */}
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminOverview} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/app">
        {() => <ProtectedRoute component={AdminApp} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/integrations">
        {() => <ProtectedRoute component={AdminIntegrations} allowedRoles={['super_admin']} />}
      </Route>

      {/* Do'kon SMS yo'llari */}
      <Route path="/shop/sms">
        {() => <ProtectedRoute component={ShopSms} allowedRoles={['shop_owner']} />}
      </Route>

      {/* Hamyon — barcha rollar uchun */}
      <Route path="/wallet">
        {() => <ProtectedRoute component={WalletPage} allowedRoles={['customer','shop_owner','worker']} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
