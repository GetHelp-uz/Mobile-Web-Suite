import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";

// ── Yuklanish spinner ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Lazy sahifalar — Auth ─────────────────────────────────────────────────────
const Landing       = lazy(() => import("@/pages/Landing"));
const Login         = lazy(() => import("@/pages/auth/Login"));
const Register      = lazy(() => import("@/pages/auth/Register"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));

// ── Lazy sahifalar — Mijoz ────────────────────────────────────────────────────
const CustomerDashboard    = lazy(() => import("@/pages/customer/CustomerDashboard"));
const BrowseTools          = lazy(() => import("@/pages/customer/BrowseTools"));
const ToolDetails          = lazy(() => import("@/pages/customer/ToolDetails"));
const MyRentals            = lazy(() => import("@/pages/customer/MyRentals"));
const BookingsPage         = lazy(() => import("@/pages/customer/Bookings"));
const ProjectsPage         = lazy(() => import("@/pages/customer/Projects"));
const ReferralPage         = lazy(() => import("@/pages/customer/Referral"));
const CustomerFavorites    = lazy(() => import("@/pages/customer/CustomerFavorites"));
const LoyaltyPage          = lazy(() => import("@/pages/customer/LoyaltyPage"));
const InsurancePage        = lazy(() => import("@/pages/customer/Insurance"));
const SubscriptionsPage    = lazy(() => import("@/pages/customer/Subscriptions"));
const ProjectCalculatorPage = lazy(() => import("@/pages/customer/ProjectCalculator"));
const WorkerPackagesPage   = lazy(() => import("@/pages/customer/WorkerPackages"));
const B2BPortalPage        = lazy(() => import("@/pages/customer/B2BPortal"));
const PeerListingsPage     = lazy(() => import("@/pages/customer/PeerListings"));
const ESignPage            = lazy(() => import("@/pages/customer/ESignPage"));

// ── Lazy sahifalar — Do'kon ───────────────────────────────────────────────────
const ShopDashboard           = lazy(() => import("@/pages/shop/ShopDashboard"));
const ShopTools               = lazy(() => import("@/pages/shop/ShopTools"));
const ShopMaintenance         = lazy(() => import("@/pages/shop/ShopMaintenance"));
const ShopPricing             = lazy(() => import("@/pages/shop/ShopPricing"));
const ShopRatings             = lazy(() => import("@/pages/shop/ShopRatings"));
const ShopBookings            = lazy(() => import("@/pages/shop/ShopBookings"));
const ShopSms                 = lazy(() => import("@/pages/shop/ShopSms"));
const ShopDocuments           = lazy(() => import("@/pages/shop/ShopDocuments"));
const ShopPromoCodes          = lazy(() => import("@/pages/shop/ShopPromoCodes"));
const ShopWorkerTasks         = lazy(() => import("@/pages/shop/ShopWorkerTasks"));
const ShopSuppliers           = lazy(() => import("@/pages/shop/ShopSuppliers"));
const ShopDamageReports       = lazy(() => import("@/pages/shop/ShopDamageReports"));
const ShopGPS                 = lazy(() => import("@/pages/shop/ShopGPS"));
const ShopHardware            = lazy(() => import("@/pages/shop/ShopHardware"));
const ShopBranches            = lazy(() => import("@/pages/shop/ShopBranches"));
const ShopStats               = lazy(() => import("@/pages/shop/ShopStats"));
const ShopInventory           = lazy(() => import("@/pages/shop/ShopInventory"));
const ShopPaymentSettings     = lazy(() => import("@/pages/shop/ShopPaymentSettings"));
const ShopDeliverySettings    = lazy(() => import("@/pages/shop/ShopDeliverySettings"));
const ShopMaintenanceSchedule = lazy(() => import("@/pages/shop/ShopMaintenanceSchedule"));
const ShopOwnerSignature      = lazy(() => import("@/pages/shop/ShopOwnerSignature"));
const WorkerPerformance       = lazy(() => import("@/pages/shop/WorkerPerformance"));
const MultiShopDashboard      = lazy(() => import("@/pages/shop/MultiShopDashboard"));
const ShopWorkerPackagesPage  = lazy(() => import("@/pages/shop/ShopWorkerPackages"));
const PublicShopProfile       = lazy(() => import("@/pages/shop/PublicShopProfile"));

// ── Lazy sahifalar — Umumiy ───────────────────────────────────────────────────
const ChatPage        = lazy(() => import("@/pages/chat/ChatPage"));
const AIRecommendPage = lazy(() => import("@/pages/ai/AIRecommendPage"));
const QRScanner       = lazy(() => import("@/pages/worker/QRScanner"));

// ── Lazy sahifalar — Admin ────────────────────────────────────────────────────
const AdminOverview       = lazy(() => import("@/pages/admin/AdminOverview"));
const AdminApp            = lazy(() => import("@/pages/admin/AdminApp"));
const AdminIntegrations   = lazy(() => import("@/pages/admin/AdminIntegrations"));
const AdminPaymentSettings = lazy(() => import("@/pages/admin/AdminPaymentSettings"));
const AdminNotifications  = lazy(() => import("@/pages/admin/AdminNotifications"));
const AdminSms            = lazy(() => import("@/pages/admin/AdminSms"));
const AdminAuditLog       = lazy(() => import("@/pages/admin/AdminAuditLog"));
const AdminTariffs        = lazy(() => import("@/pages/admin/AdminTariffs"));
const AdminCommissions    = lazy(() => import("@/pages/admin/AdminCommissions"));
const AdminWithdrawals    = lazy(() => import("@/pages/admin/AdminWithdrawals"));
const AdminAppManagement  = lazy(() => import("@/pages/admin/AdminAppManagement"));
const AdminPlugins        = lazy(() => import("@/pages/admin/AdminPlugins"));
const AdminAIAssistant    = lazy(() => import("@/pages/admin/AdminAIAssistant"));
const AdminUsers          = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminShops          = lazy(() => import("@/pages/admin/AdminShops"));
const AdminDocuments      = lazy(() => import("@/pages/admin/AdminDocuments"));
const AdminB2BPage        = lazy(() => import("@/pages/admin/AdminB2B"));
const AdminToolPassports  = lazy(() => import("@/pages/admin/AdminToolPassports"));
const AdminHardware       = lazy(() => import("@/pages/admin/AdminHardware"));
const AdminFunds          = lazy(() => import("@/pages/admin/AdminFunds"));

// ── Lazy sahifalar — Boshqalar ────────────────────────────────────────────────
const WalletPage          = lazy(() => import("@/pages/wallet/Wallet"));
const NotificationsCenter = lazy(() => import("@/pages/NotificationsCenter"));
const InvestmentsPage     = lazy(() => import("@/pages/investments/InvestmentsPage"));
const MyInvestmentsPage   = lazy(() => import("@/pages/investments/MyInvestmentsPage"));
const ToolPassport        = lazy(() => import("@/pages/ToolPassport"));
const NotFound            = lazy(() => import("@/pages/not-found"));

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

// ── Himoyalangan marshrut ─────────────────────────────────────────────────────
function ProtectedRoute({ component: Component, allowedRoles }: { component: any; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    switch (user.role) {
      case "super_admin": return <Redirect to="/admin" />;
      case "shop_owner":  return <Redirect to="/shop" />;
      case "worker":      return <Redirect to="/worker" />;
      case "customer":    return <Redirect to="/home" />;
      default:            return <Redirect to="/" />;
    }
  }
  return <Component />;
}

// ── Root yo'naltirish ─────────────────────────────────────────────────────────
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Landing />;
  switch (user?.role) {
    case "super_admin": return <Redirect to="/admin" />;
    case "shop_owner":  return <Redirect to="/shop" />;
    case "worker":      return <Redirect to="/worker" />;
    case "customer":    return <Redirect to="/home" />;
    default:            return <Landing />;
  }
}

// ── Marshrutlar ───────────────────────────────────────────────────────────────
function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={RootRedirect} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />

        {/* Mijoz */}
        <Route path="/home">{() => <ProtectedRoute component={CustomerDashboard} allowedRoles={["customer"]} />}</Route>
        <Route path="/browse">{() => <ProtectedRoute component={BrowseTools} allowedRoles={["customer"]} />}</Route>
        <Route path="/tools/:id">{() => <ProtectedRoute component={ToolDetails} allowedRoles={["customer"]} />}</Route>
        <Route path="/my-rentals">{() => <ProtectedRoute component={MyRentals} allowedRoles={["customer"]} />}</Route>
        <Route path="/bookings">{() => <ProtectedRoute component={BookingsPage} allowedRoles={["customer"]} />}</Route>
        <Route path="/projects">{() => <ProtectedRoute component={ProjectsPage} allowedRoles={["customer"]} />}</Route>
        <Route path="/referral">{() => <ProtectedRoute component={ReferralPage} allowedRoles={["customer","shop_owner","worker"]} />}</Route>
        <Route path="/favorites">{() => <ProtectedRoute component={CustomerFavorites} allowedRoles={["customer"]} />}</Route>
        <Route path="/loyalty">{() => <ProtectedRoute component={LoyaltyPage} allowedRoles={["customer"]} />}</Route>
        <Route path="/insurance">{() => <ProtectedRoute component={InsurancePage} allowedRoles={["customer","shop_owner"]} />}</Route>
        <Route path="/subscriptions">{() => <ProtectedRoute component={SubscriptionsPage} allowedRoles={["customer"]} />}</Route>
        <Route path="/calculator">{() => <ProtectedRoute component={ProjectCalculatorPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>
        <Route path="/worker-packages">{() => <ProtectedRoute component={WorkerPackagesPage} allowedRoles={["customer"]} />}</Route>
        <Route path="/b2b">{() => <ProtectedRoute component={B2BPortalPage} allowedRoles={["customer","shop_owner"]} />}</Route>
        <Route path="/peer-listings">{() => <ProtectedRoute component={PeerListingsPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>
        <Route path="/esign">{() => <ProtectedRoute component={ESignPage} allowedRoles={["customer","shop_owner","super_admin"]} />}</Route>

        {/* Do'kon */}
        <Route path="/shop">{() => <ProtectedRoute component={ShopDashboard} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/tools">{() => <ProtectedRoute component={ShopTools} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/bookings">{() => <ProtectedRoute component={ShopBookings} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/maintenance">{() => <ProtectedRoute component={ShopMaintenance} allowedRoles={["shop_owner","worker"]} />}</Route>
        <Route path="/shop/pricing">{() => <ProtectedRoute component={ShopPricing} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/ratings">{() => <ProtectedRoute component={ShopRatings} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/sms">{() => <ProtectedRoute component={ShopSms} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/documents">{() => <ProtectedRoute component={ShopDocuments} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/promo-codes">{() => <ProtectedRoute component={ShopPromoCodes} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/worker-tasks">{() => <ProtectedRoute component={ShopWorkerTasks} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/suppliers">{() => <ProtectedRoute component={ShopSuppliers} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/damage-reports">{() => <ProtectedRoute component={ShopDamageReports} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/gps">{() => <ProtectedRoute component={ShopGPS} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/hardware">{() => <ProtectedRoute component={ShopHardware} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/branches">{() => <ProtectedRoute component={ShopBranches} allowedRoles={["shop_owner"]} />}</Route>
        <Route path="/shop/stats">{() => <ProtectedRoute component={ShopStats} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/inventory">{() => <ProtectedRoute component={ShopInventory} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/payment-settings">{() => <ProtectedRoute component={ShopPaymentSettings} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/delivery-settings">{() => <ProtectedRoute component={ShopDeliverySettings} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/maintenance-schedule">{() => <ProtectedRoute component={ShopMaintenanceSchedule} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/owner-signature">{() => <ProtectedRoute component={ShopOwnerSignature} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/worker-performance">{() => <ProtectedRoute component={WorkerPerformance} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/network">{() => <ProtectedRoute component={MultiShopDashboard} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shop/worker-packages">{() => <ProtectedRoute component={ShopWorkerPackagesPage} allowedRoles={["shop_owner","super_admin"]} />}</Route>
        <Route path="/shops/:id">{() => <PublicShopProfile />}</Route>

        {/* Hodim */}
        <Route path="/worker">{() => <ProtectedRoute component={QRScanner} allowedRoles={["worker","shop_owner"]} />}</Route>
        <Route path="/worker/rentals">{() => <ProtectedRoute component={MyRentals} allowedRoles={["worker","shop_owner"]} />}</Route>

        {/* Umumiy */}
        <Route path="/chat">{() => <ProtectedRoute component={ChatPage} allowedRoles={["customer","shop_owner"]} />}</Route>
        <Route path="/ai-suggest">{() => <ProtectedRoute component={AIRecommendPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>

        {/* Admin */}
        <Route path="/admin">{() => <ProtectedRoute component={AdminOverview} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/app">{() => <ProtectedRoute component={AdminApp} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/integrations">{() => <ProtectedRoute component={AdminIntegrations} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/payment-settings">{() => <ProtectedRoute component={AdminPaymentSettings} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/notifications">{() => <ProtectedRoute component={AdminNotifications} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/sms">{() => <ProtectedRoute component={AdminSms} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/audit">{() => <ProtectedRoute component={AdminAuditLog} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/tariffs">{() => <ProtectedRoute component={AdminTariffs} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/commissions">{() => <ProtectedRoute component={AdminCommissions} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/withdrawals">{() => <ProtectedRoute component={AdminWithdrawals} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/app-management">{() => <ProtectedRoute component={AdminAppManagement} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/plugins">{() => <ProtectedRoute component={AdminPlugins} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/ai-assistant">{() => <ProtectedRoute component={AdminAIAssistant} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsers} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/shops">{() => <ProtectedRoute component={AdminShops} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/documents">{() => <ProtectedRoute component={AdminDocuments} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/b2b">{() => <ProtectedRoute component={AdminB2BPage} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/tool-passports">{() => <ProtectedRoute component={AdminToolPassports} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/hardware">{() => <ProtectedRoute component={AdminHardware} allowedRoles={["super_admin"]} />}</Route>
        <Route path="/admin/funds">{() => <ProtectedRoute component={AdminFunds} allowedRoles={["super_admin"]} />}</Route>

        {/* Investitsiya */}
        <Route path="/investments">{() => <ProtectedRoute component={InvestmentsPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>
        <Route path="/investments/my">{() => <ProtectedRoute component={MyInvestmentsPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>

        {/* Hamyon & Bildirishnomalar */}
        <Route path="/wallet">{() => <ProtectedRoute component={WalletPage} allowedRoles={["customer","shop_owner","worker","super_admin"]} />}</Route>
        <Route path="/notifications-center">{() => <ProtectedRoute component={NotificationsCenter} />}</Route>

        {/* Ommaviy */}
        <Route path="/passport/:qrCode">{() => <ToolPassport />}</Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// ── Asosiy ilova ──────────────────────────────────────────────────────────────
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
