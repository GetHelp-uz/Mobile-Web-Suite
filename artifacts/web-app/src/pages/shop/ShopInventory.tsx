import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Minus, AlertTriangle, CheckCircle2, Search } from "lucide-react";

export default function ShopInventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Record<number, number>>({});

  const load = async () => {
    const r = await fetch(`${baseUrl}/api/tools?shopId=${shopId}`, { headers: h });
    const d = await r.json();
    setTools(d.tools || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = tools.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  const updateStock = async (toolId: number, stock: number) => {
    if (stock < 0) return;
    try {
      const r = await fetch(`${baseUrl}/api/tools/${toolId}/stock`, {
        method: "PATCH", headers: h, body: JSON.stringify({ stockCount: stock }),
      });
      if (r.ok) {
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, stock_count: stock } : t));
        setEditing(prev => { const n = { ...prev }; delete n[toolId]; return n; });
        toast({ title: "Zaxira yangilandi" });
      }
    } catch { toast({ title: "Xatolik", variant: "destructive" }); }
  };

  const totalTools = tools.length;
  const totalStock = tools.reduce((s, t) => s + (t.stock_count || 1), 0);
  const lowStock = tools.filter(t => (t.stock_count || 1) <= 1 && t.status === "rented");
  const available = tools.filter(t => t.status === "available").length;

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold mb-1">Zaxira boshqaruvi</h1>
          <p className="text-muted-foreground">Asboblar inventari va zaxira miqdori</p>
        </div>
      </div>

      {/* Umumiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Jami asbob turi", value: totalTools, icon: Package, color: "text-primary" },
          { label: "Jami zaxira soni", value: totalStock, icon: CheckCircle2, color: "text-green-600" },
          { label: "Mavjud", value: available, icon: CheckCircle2, color: "text-blue-600" },
          { label: "Kam zaxira", value: lowStock.length, icon: AlertTriangle, color: "text-red-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Past zaxira ogohlantirishi */}
      {lowStock.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{lowStock.length} ta asbob</strong> kam zaxirada va ijarada — zaxirani to'ldiring!
          </p>
        </div>
      )}

      {/* Qidirish */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Asbob nomi yoki kategoriya..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Jadval */}
      <Card>
        <CardHeader>
          <CardTitle>Asboblar zaxirasi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>Asboblar topilmadi</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(tool => {
                const stock = editing[tool.id] !== undefined ? editing[tool.id] : (tool.stock_count || 1);
                const isLow = stock <= 1 && tool.status === "rented";
                return (
                  <div key={tool.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${isLow ? "border-red-200 bg-red-50/50" : "border-border hover:bg-muted/40"}`}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{tool.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{tool.category}</span>
                        <Badge variant={tool.status === "available" ? "success" : tool.status === "rented" ? "default" : "secondary"} className="text-xs">
                          {tool.status === "available" ? "Mavjud" : tool.status === "rented" ? "Ijarada" : tool.status}
                        </Badge>
                        {isLow && <Badge variant="destructive" className="text-xs">Kam zaxira!</Badge>}
                      </div>
                    </div>
                    <div className="text-right mr-2">
                      <p className="text-xs text-muted-foreground">Narxi</p>
                      <p className="text-sm font-bold">{formatCurrency(Number(tool.price_per_day))}/kun</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="outline" className="w-8 h-8"
                        onClick={() => setEditing(prev => ({ ...prev, [tool.id]: Math.max(0, (prev[tool.id] ?? (tool.stock_count || 1)) - 1) }))}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        className="w-14 text-center h-8"
                        value={stock}
                        min={0}
                        onChange={e => setEditing(prev => ({ ...prev, [tool.id]: Math.max(0, Number(e.target.value)) }))}
                      />
                      <Button size="icon" variant="outline" className="w-8 h-8"
                        onClick={() => setEditing(prev => ({ ...prev, [tool.id]: (prev[tool.id] ?? (tool.stock_count || 1)) + 1 }))}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      {editing[tool.id] !== undefined && (
                        <Button size="sm" className="h-8" onClick={() => updateStock(tool.id, editing[tool.id])}>
                          Saqlash
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
