import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Users, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

type Rental = {
  id: number; customer_phone: string; customer_name: string;
  tool_name: string; due_date: string; status: string;
};
type SmsTemplate = { id: number; name: string; type: string; message: string; };
type SmsLog = { id: number; phone: string; message: string; status: string; sent_at: string; error_message: string | null; };

export default function ShopSms() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<number | null>(null);

  // Single SMS
  const [singleOpen, setSingleOpen] = useState(false);
  const [singlePhone, setSinglePhone] = useState("");
  const [singleMsg, setSingleMsg] = useState("");
  const [singleRentalId, setSingleRentalId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  // Bulk SMS
  const [bulkMsg, setBulkMsg] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<string[]>([]);
  const [bulkSending, setBulkSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [rd, td, ld] = await Promise.all([
        fetch("/api/rentals?status=active&limit=50", { headers: h }).then(r => r.json()),
        fetch("/api/sms/templates", { headers: h }).then(r => r.json()),
        fetch("/api/sms/logs?limit=20", { headers: h }).then(r => r.json()),
      ]);

      // Ijaralar ma'lumotlari
      const rentalList = (rd.rentals || []).map((r: any) => ({
        id: r.id,
        customer_phone: r.customer?.phone || "",
        customer_name: r.customer?.name || "Noma'lum",
        tool_name: r.tool?.name || "Noma'lum asbob",
        due_date: r.dueDate || r.due_date,
        status: r.status,
      }));
      setRentals(rentalList);
      if (rd.rentals?.[0]?.shopId) setShopId(rd.rentals[0].shopId);
      setTemplates(td.templates || []);
      setLogs(ld.logs || []);
    } catch {
      toast({ title: "Xatolik", description: "Ma'lumotlar yuklanmadi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openSingle = (rental: Rental) => {
    setSinglePhone(rental.customer_phone);
    setSingleRentalId(rental.id);
    const defaultMsg = `Hurmatli ${rental.customer_name}, "${rental.tool_name}" asbobining ijara muddati: ${new Date(rental.due_date).toLocaleDateString("uz-UZ")}. Do'konimizga tashrif buyuring.`;
    setSingleMsg(defaultMsg);
    setSingleOpen(true);
  };

  const sendSingle = async () => {
    if (!singlePhone || !singleMsg) return;
    setSending(true);
    try {
      const r = await fetch("/api/sms/send", {
        method: "POST", headers: h,
        body: JSON.stringify({ phone: singlePhone, message: singleMsg, shopId, rentalId: singleRentalId })
      });
      const d = await r.json();
      if (d.success) {
        toast({ title: "SMS yuborildi!", description: `${singlePhone} raqamiga muvaffaqiyatli yuborildi` });
        setSingleOpen(false);
        load();
      } else {
        toast({ title: "Xatolik", description: d.error || "SMS yuborilmadi", variant: "destructive" });
      }
    } finally {
      setSending(false);
    }
  };

  const sendBulk = async () => {
    if (!selectedPhones.length || !bulkMsg) return;
    setBulkSending(true);
    try {
      const r = await fetch("/api/sms/send-bulk", {
        method: "POST", headers: h,
        body: JSON.stringify({ phones: selectedPhones, message: bulkMsg, shopId })
      });
      const d = await r.json();
      toast({
        title: "Bulk SMS yuborildi!",
        description: `${d.success} ta muvaffaqiyatli, ${d.failed} ta muvaffaqiyatsiz`
      });
      setSelectedPhones([]);
      setBulkMsg("");
      load();
    } finally {
      setBulkSending(false);
    }
  };

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev =>
      prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]
    );
  };

  const overdueRentals = rentals.filter(r => {
    const due = new Date(r.due_date);
    return due < new Date() || r.status === "overdue";
  });

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">SMS Xabarlar</h1>
          <p className="text-muted-foreground">Mijozlarga SMS yuborish va ijara eslatmalari</p>
        </div>
        <Button onClick={() => { setSinglePhone(""); setSingleMsg(""); setSingleRentalId(null); setSingleOpen(true); }} className="gap-2">
          <Send size={18} /> SMS Yuborish
        </Button>
      </div>

      {/* Muddati o'tganlar kartasi */}
      {overdueRentals.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50/30">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <MessageSquare size={24} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold">Muddati o'tgan {overdueRentals.length} ta ijara</h3>
              <p className="text-sm text-muted-foreground">Ushbu mijozlarga ogohlantirish SMS yuborish tavsiya etiladi</p>
            </div>
            <Button variant="outline" className="border-orange-300 text-orange-700" onClick={() => {
              setSelectedPhones(overdueRentals.map(r => r.customer_phone).filter(Boolean));
              const tmpl = templates.find(t => t.type === "overdue");
              if (tmpl) setBulkMsg(tmpl.message);
            }}>
              Barchasini tanlash
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="customers">
        <TabsList className="mb-6">
          <TabsTrigger value="customers" className="gap-2"><Users size={16} /> Mijozlar</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-2"><Send size={16} /> Ko'plab SMS</TabsTrigger>
          <TabsTrigger value="logs" className="gap-2"><Clock size={16} /> Tarix</TabsTrigger>
        </TabsList>

        {/* ─── Mijozlar ─────────────────────────────────────────────────── */}
        <TabsContent value="customers">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="h-20 animate-pulse bg-muted" />)}</div>
          ) : rentals.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Hozirda faol ijaralar yo'q</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {rentals.map(r => {
                const isOverdue = new Date(r.due_date) < new Date() || r.status === "overdue";
                return (
                  <Card key={r.id} className={isOverdue ? "border-orange-200" : ""}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isOverdue ? "bg-orange-100 text-orange-700" : "bg-primary/10 text-primary"}`}>
                        {r.customer_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.customer_name}</span>
                          {isOverdue && <Badge variant="destructive" className="text-xs">Muddati o'tgan</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{r.customer_phone} · {r.tool_name}</p>
                        <p className="text-xs text-muted-foreground">Muddat: {new Date(r.due_date).toLocaleDateString("uz-UZ")}</p>
                      </div>
                      <Button size="sm" variant={isOverdue ? "destructive" : "outline"} className="gap-2 flex-shrink-0" onClick={() => openSingle(r)}>
                        <MessageSquare size={14} /> SMS
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Ko'plab SMS ─────────────────────────────────────────────── */}
        <TabsContent value="bulk">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Qabul qiluvchilarni tanlang</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button size="sm" variant="outline" onClick={() => setSelectedPhones(rentals.map(r => r.customer_phone).filter(Boolean))}>Barchasini tanlash</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedPhones([])}>Tozalash</Button>
                  <Badge variant="secondary" className="ml-auto">{selectedPhones.length} ta tanlangan</Badge>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {rentals.map(r => r.customer_phone ? (
                    <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedPhones.includes(r.customer_phone) ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary"}`} onClick={() => togglePhone(r.customer_phone)}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedPhones.includes(r.customer_phone) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {selectedPhones.includes(r.customer_phone) && <CheckCircle size={12} className="text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Xabar matni</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Shablon tanlash</label>
                  <div className="flex flex-wrap gap-2">
                    {templates.map(t => (
                      <button key={t.id} type="button" className="text-xs px-3 py-1.5 rounded-full border hover:bg-secondary transition-colors" onClick={() => setBulkMsg(t.message)}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  className="w-full min-h-[150px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  placeholder="SMS xabar matni..."
                  value={bulkMsg}
                  onChange={e => setBulkMsg(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{bulkMsg.length} belgi · ~{Math.ceil(bulkMsg.length / 160)} SMS</p>
                <Button className="w-full gap-2" onClick={sendBulk} disabled={bulkSending || !selectedPhones.length || !bulkMsg}>
                  <Send size={16} /> {bulkSending ? "Yuborilmoqda..." : `${selectedPhones.length} ta raqamga yuborish`}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tarix ───────────────────────────────────────────────────── */}
        <TabsContent value="logs">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">SMS tarixi</h2>
            <Button variant="outline" size="sm" onClick={load} className="gap-2"><RefreshCw size={14} /> Yangilash</Button>
          </div>
          {logs.length === 0 ? (
            <Card><CardContent className="p-12 text-center text-muted-foreground">Hali SMS yuborilmagan</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <Card key={log.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${log.status === "sent" ? "bg-green-100" : log.status === "failed" ? "bg-red-100" : "bg-yellow-100"}`}>
                      {log.status === "sent" ? <CheckCircle size={18} className="text-green-600" /> : log.status === "failed" ? <XCircle size={18} className="text-red-600" /> : <Clock size={18} className="text-yellow-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.phone}</span>
                        <Badge variant={log.status === "sent" ? "success" as any : log.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                          {log.status === "sent" ? "Yuborildi" : log.status === "failed" ? "Xatolik" : "Kutilmoqda"}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">{new Date(log.sent_at).toLocaleString("uz-UZ")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{log.message}</p>
                      {log.error_message && <p className="text-xs text-destructive">{log.error_message}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Single SMS Dialog */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>SMS Yuborish</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-1 block">Telefon raqam *</label>
              <Input placeholder="+998 90 123 45 67" value={singlePhone} onChange={e => setSinglePhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1 block">Xabar *</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                value={singleMsg}
                onChange={e => setSingleMsg(e.target.value)}
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {templates.map(t => (
                  <button key={t.id} type="button" className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80" onClick={() => setSingleMsg(t.message)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleOpen(false)}>Bekor</Button>
            <Button onClick={sendSingle} disabled={sending || !singlePhone || !singleMsg} className="gap-2">
              <Send size={16} /> {sending ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
