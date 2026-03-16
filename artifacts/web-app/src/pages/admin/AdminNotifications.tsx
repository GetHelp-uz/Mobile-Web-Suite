import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Send, Users, Megaphone } from "lucide-react";

export default function AdminNotifications() {
  const { toast } = useToast();
  const token = localStorage.getItem("tool_rent_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [broadcastForm, setBroadcastForm] = useState({ title: "", body: "", role: "" });
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState<any>({ total: 0 });

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title || !broadcastForm.body) {
      toast({ title: "Xatolik", description: "Sarlavha va matn kerak", variant: "destructive" }); return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/notifications/broadcast", {
        method: "POST", headers: h,
        body: JSON.stringify(broadcastForm),
      });
      const d = await r.json();
      if (!r.ok) { toast({ title: "Xatolik", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Yuborildi!", description: `${d.sent} ta foydalanuvchiga yuborildi` });
      setBroadcastForm({ title: "", body: "", role: "" });
    } finally { setSending(false); }
  };

  const TEMPLATES = [
    { title: "Yangi funksiya!", body: "ToolRent ilovasida yangi imkoniyatlar paydo bo'ldi. Ko'ring!" },
    { title: "Maxsus taklif", body: "Bu hafta barcha do'konlarda 10% chegirma! Tez foydalaning." },
    { title: "Xizmat yangilandi", body: "ToolRent xizmati yangilandi. Yaxshilangan tezlik va yangi imkoniyatlar." },
    { title: "Eslatma", body: "Ijara muddatingiz yaqin. Iltimos, asbobni o'z vaqtida qaytaring." },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-1">Push bildirishnomalar</h1>
        <p className="text-muted-foreground">Foydalanuvchilarga push xabar yuborish</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Broadcast yuborish */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Megaphone size={18}/> Ommaviy xabar yuborish</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={sendBroadcast} className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Rol bo'yicha filter</label>
                <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={broadcastForm.role} onChange={e => setBroadcastForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="">Barcha foydalanuvchilar</option>
                  <option value="customer">Faqat mijozlar</option>
                  <option value="shop_owner">Faqat do'kon egalari</option>
                  <option value="worker">Faqat hodimlar</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Sarlavha *</label>
                <Input placeholder="Xabar sarlavhasi..." value={broadcastForm.title} onChange={e => setBroadcastForm(f => ({ ...f, title: e.target.value }))} required/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Matn *</label>
                <textarea className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[80px] resize-none" placeholder="Xabar matni..." value={broadcastForm.body} onChange={e => setBroadcastForm(f => ({ ...f, body: e.target.value }))} required/>
              </div>
              <Button type="submit" disabled={sending} className="w-full gap-2">
                <Send size={16}/> {sending ? "Yuborilmoqda..." : "Yuborish"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Shablonlar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell size={18}/> Tayyor shablonlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {TEMPLATES.map((t, i) => (
                <div key={i} className="border rounded-xl p-4 hover:bg-secondary/50 transition-colors cursor-pointer" onClick={() => setBroadcastForm(f => ({ ...f, title: t.title, body: t.body }))}>
                  <p className="font-semibold text-sm mb-1">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.body}</p>
                  <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs">Ishlatish</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bell size={24} className="text-blue-600"/>
            </div>
            <div>
              <h3 className="font-bold mb-2">Push bildirishnomalar haqida</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Foydalanuvchilar Expo Go orqali ilovaga kirganda, bildirishnoma tokenlarini ro'yxatdan o'tkazadilar.
                Push xabarlar Expo Push API orqali yuboriladi.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-muted-foreground">Qo'llab-quvvatlanadigan platformalar</p>
                  <p className="font-semibold">iOS, Android</p>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <p className="text-muted-foreground">Xizmat ko'rsatuvchi</p>
                  <p className="font-semibold">Expo Push API</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
