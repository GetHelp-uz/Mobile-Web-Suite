import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-500 bg-blue-50",
  success: "text-green-500 bg-green-50",
  warning: "text-orange-500 bg-orange-50",
  error: "text-red-500 bg-red-50",
};

export default function NotificationsCenter() {
  const { user } = useAuth();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/in-app-notifications`, { headers: h });
      const d = await r.json();
      setNotifications(d.notifications || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await fetch(`${baseUrl}/api/in-app-notifications/${id}/read`, { method: "PATCH", headers: h });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await fetch(`${baseUrl}/api/in-app-notifications/read-all`, { method: "PATCH", headers: h });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Bildirishnomalar
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground text-sm font-bold rounded-full px-2.5 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-muted-foreground">Barcha tizim bildirishnomalari</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" /> Barchasini o'qilgan deb belgilash
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Xabarlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/20" />
                <p className="text-muted-foreground">Hali bildirishnomalar yo'q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => {
                  const Icon = TYPE_ICONS[n.type] || Info;
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                        n.is_read ? "bg-transparent hover:bg-muted/20" : "bg-primary/5 border border-primary/10 hover:bg-primary/10"
                      }`}
                      onClick={() => !n.is_read && markRead(n.id)}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[n.type] || TYPE_COLORS.info}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className={`font-medium ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>{n.title}</div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(n.created_at).toLocaleString("uz-UZ")}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>
                      </div>
                      {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
