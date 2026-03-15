import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  LayoutDashboard, 
  Hammer, 
  Users, 
  Building2, 
  LogOut,
  Menu,
  QrCode,
  FileText
} from "lucide-react";
import { motion } from "framer-motion";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = {
    customer: [
      { name: "Browse Tools", path: "/browse", icon: Wrench },
      { name: "My Rentals", path: "/my-rentals", icon: FileText },
    ],
    shop_owner: [
      { name: "Dashboard", path: "/shop", icon: LayoutDashboard },
      { name: "My Tools", path: "/shop/tools", icon: Hammer },
      { name: "Rentals", path: "/shop/rentals", icon: FileText },
      { name: "Workers", path: "/shop/workers", icon: Users },
    ],
    worker: [
      { name: "QR Scanner", path: "/worker", icon: QrCode },
      { name: "Active Rentals", path: "/worker/rentals", icon: FileText },
    ],
    super_admin: [
      { name: "Overview", path: "/admin", icon: LayoutDashboard },
      { name: "Shops", path: "/admin/shops", icon: Building2 },
      { name: "Users", path: "/admin/users", icon: Users },
    ]
  };

  const links = user ? navItems[user.role] : [];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-card border-r border-border/50 flex flex-col shadow-xl md:shadow-none z-10 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-accent/20">
            <Hammer size={20} />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">
            ToolRent<span className="text-accent">.</span>
          </span>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2">
          {links.map((link) => {
            const isActive = location === link.path || location.startsWith(link.path + '/');
            return (
              <Link key={link.path} href={link.path} className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}>
                <link.icon size={20} className={cn(
                  "transition-transform duration-200 group-hover:scale-110",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                )} />
                {link.name}
              </Link>
            );
          })}
        </div>

        <div className="p-6 border-t border-border/50">
          <div className="flex items-center gap-3 mb-6 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-primary">
              {user?.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white">
            <Hammer size={16} />
          </div>
          <span className="font-display font-bold text-lg">ToolRent.</span>
        </div>
        <Button variant="ghost" size="icon">
          <Menu />
        </Button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

// Utility function duplicated here for isolated component scope if needed, but normally imported
function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}
