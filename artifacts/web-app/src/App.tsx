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
import BookingsPage from "@/pages/customer/Bookings";
import ProjectsPage from "@/pages/customer/Projects";
import ReferralPage from "@/pages/customer/Referral";
import CustomerFavorites from "@/pages/customer/CustomerFavorites";
import LoyaltyPage from "@/pages/customer/LoyaltyPage";
import ShopDashboard from "@/pages/shop/ShopDashboard";
import ShopTools from "@/pages/shop/ShopTools";
import ShopMaintenance from "@/pages/shop/ShopMaintenance";
import ShopPricing from "@/pages/shop/ShopPricing";
import ShopRatings from "@/pages/shop/ShopRatings";
import ShopBookings from "@/pages/shop/ShopBookings";
import ShopSms from "@/pages/shop/ShopSms";
import ShopDocuments from "@/pages/shop/ShopDocuments";
import ShopPromoCodes from "@/pages/shop/ShopPromoCodes";
import ShopWorkerTasks from "@/pages/shop/ShopWorkerTasks";
import ShopSuppliers from "@/pages/shop/ShopSuppliers";
import ShopDamageReports from "@/pages/shop/ShopDamageReports";
import ShopGPS from "@/pages/shop/ShopGPS";
import ShopBranches from "@/pages/shop/ShopBranches";
import ShopStats from "@/pages/shop/ShopStats";
import ShopInventory from "@/pages/shop/ShopInventory";
import PublicShopProfile from "@/pages/shop/PublicShopProfile";
import ChatPage from "@/pages/chat/ChatPage";
import AIRecommendPage from "@/pages/ai/AIRecommendPage";
import QRScanner from "@/pages/worker/QRScanner";
import AdminOverview from "@/pages/admin/AdminOverview";
import AdminApp from "@/pages/admin/AdminApp";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";
import AdminPaymentSettings from "@/pages/admin/AdminPaymentSettings";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import ShopPaymentSettings from "@/pages/shop/ShopPaymentSettings";
import ShopDeliverySettings from "@/pages/shop/ShopDeliverySettings";
import ShopMaintenanceSchedule from "@/pages/shop/ShopMaintenanceSchedule";
import WorkerPerformance from "@/pages/shop/WorkerPerformance";
import MultiShopDashboard from "@/pages/shop/MultiShopDashboard";
import ESignPage from "@/pages/customer/ESignPage";
import WalletPage from "@/pages/wallet/Wallet";
import NotificationsCenter from "@/pages/NotificationsCenter";
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
      <Route path="/bookings">
        {() => <ProtectedRoute component={BookingsPage} allowedRoles={['customer']} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={ProjectsPage} allowedRoles={['customer']} />}
      </Route>
      <Route path="/referral">
        {() => <ProtectedRoute component={ReferralPage} allowedRoles={['customer','shop_owner','worker']} />}
      </Route>
      <Route path="/favorites">
        {() => <ProtectedRoute component={CustomerFavorites} allowedRoles={['customer']} />}
      </Route>
      <Route path="/loyalty">
        {() => <ProtectedRoute component={LoyaltyPage} allowedRoles={['customer']} />}
      </Route>

      {/* Do'kon egasi yo'llari */}
      <Route path="/shop">
        {() => <ProtectedRoute component={ShopDashboard} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/tools">
        {() => <ProtectedRoute component={ShopTools} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/bookings">
        {() => <ProtectedRoute component={ShopBookings} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/maintenance">
        {() => <ProtectedRoute component={ShopMaintenance} allowedRoles={['shop_owner','worker']} />}
      </Route>
      <Route path="/shop/pricing">
        {() => <ProtectedRoute component={ShopPricing} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/ratings">
        {() => <ProtectedRoute component={ShopRatings} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/sms">
        {() => <ProtectedRoute component={ShopSms} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/documents">
        {() => <ProtectedRoute component={ShopDocuments} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/promo-codes">
        {() => <ProtectedRoute component={ShopPromoCodes} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/worker-tasks">
        {() => <ProtectedRoute component={ShopWorkerTasks} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/suppliers">
        {() => <ProtectedRoute component={ShopSuppliers} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/damage-reports">
        {() => <ProtectedRoute component={ShopDamageReports} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/gps">
        {() => <ProtectedRoute component={ShopGPS} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/branches">
        {() => <ProtectedRoute component={ShopBranches} allowedRoles={['shop_owner']} />}
      </Route>
      <Route path="/shop/stats">
        {() => <ProtectedRoute component={ShopStats} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shop/inventory">
        {() => <ProtectedRoute component={ShopInventory} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shops/:id">
        {() => <PublicShopProfile />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} allowedRoles={['customer', 'shop_owner']} />}
      </Route>
      <Route path="/ai-suggest">
        {() => <ProtectedRoute component={AIRecommendPage} allowedRoles={['customer', 'shop_owner', 'worker', 'super_admin']} />}
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
      <Route path="/admin/payment-settings">
        {() => <ProtectedRoute component={AdminPaymentSettings} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/shop/payment-settings">
        {() => <ProtectedRoute component={ShopPaymentSettings} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shop/delivery-settings">
        {() => <ProtectedRoute component={ShopDeliverySettings} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shop/maintenance-schedule">
        {() => <ProtectedRoute component={ShopMaintenanceSchedule} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shop/worker-performance">
        {() => <ProtectedRoute component={WorkerPerformance} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/shop/network">
        {() => <ProtectedRoute component={MultiShopDashboard} allowedRoles={['shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/esign">
        {() => <ProtectedRoute component={ESignPage} allowedRoles={['customer', 'shop_owner', 'super_admin']} />}
      </Route>
      <Route path="/admin/notifications">
        {() => <ProtectedRoute component={AdminNotifications} allowedRoles={['super_admin']} />}
      </Route>
      <Route path="/admin/audit">
        {() => <ProtectedRoute component={AdminAuditLog} allowedRoles={['super_admin']} />}
      </Route>

      {/* Hamyon va bildirishnomalar — barcha rollar */}
      <Route path="/wallet">
        {() => <ProtectedRoute component={WalletPage} allowedRoles={['customer','shop_owner','worker']} />}
      </Route>
      <Route path="/notifications-center">
        {() => <ProtectedRoute component={NotificationsCenter} />}
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
