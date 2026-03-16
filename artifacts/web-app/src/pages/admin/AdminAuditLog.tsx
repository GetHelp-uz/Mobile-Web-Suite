import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Shield, Search, RefreshCw, ChevronDown } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  document_upload: "bg-blue-100 text-blue-700",
  login: "bg-green-100 text-green-700",
  logout: "bg-gray-100 text-gray-700",
  create: "bg-indigo-100 text-indigo-700",
  update: "bg-yellow-100 text-yellow-700",
  delete: "bg-red-100 text-red-700",
};

export default function AdminAuditLog() {
  const { user } = useAuth();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = async (off = 0) => {
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/audit?limit=${LIMIT}&offset=${off}`, { headers: h });
      const d = await r.json();
      if (off === 0) setLogs(d.logs || []);
      else setLogs(prev => [...prev, ...(d.logs || [])]);
      setOffset(off + LIMIT);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = search
    ? logs.filter(l => l.action?.includes(search) || l.user_name?.toLowerCase().includes(search.toLowerCase()) || l.entity_type?.includes(search))
    : logs;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Jurnali</h1>
            <p className="text-muted-foreground">Tizimda barcha amalga oshirilgan amallar tarixi</p>
          </div>
          <Button variant="outline" onClick={() => load(0)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Yangilash
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Amal, foydalanuvchi, ob'ekt..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Barcha amallar ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {loading && logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Amallar topilmadi</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map(log => (
                  <div key={log.id} className="flex items-start justify-between py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                        {log.action}
                      </span>
                      <div>
                        <div className="text-sm">
                          <strong>{log.user_name || "Tizim"}</strong>
                          {log.user_role && <span className="text-muted-foreground ml-1">({log.user_role})</span>}
                          {log.entity_type && <span className="text-muted-foreground ml-1">• {log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</span>}
                        </div>
                        {log.details && (
                          <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {typeof log.details === "object" ? JSON.stringify(log.details).slice(0, 80) : log.details}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                      {new Date(log.created_at).toLocaleString("uz-UZ")}
                    </div>
                  </div>
                ))}
                <div className="text-center pt-4">
                  <Button variant="outline" onClick={() => load(offset)} disabled={loading}>
                    <ChevronDown className="h-4 w-4 mr-2" /> Ko'proq yuklash
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
