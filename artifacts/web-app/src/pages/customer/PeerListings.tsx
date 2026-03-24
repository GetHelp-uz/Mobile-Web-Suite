import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Users2, MapPin, Plus, Star, Package, Calendar, X, Edit, Trash2, Search } from "lucide-react";

const CONDITIONS: Record<string, { label: string; color: string }> = {
  excellent: { label: "A'lo", color: "text-green-600 bg-green-50" },
  good: { label: "Yaxshi", color: "text-blue-600 bg-blue-50" },
  fair: { label: "O'rtacha", color: "text-yellow-600 bg-yellow-50" },
};

export default function PeerListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [tab, setTab] = useState<"browse" | "my">("browse");
  const [listings, setListings] = useState<any[]>([]);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRentForm, setShowRentForm] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", dailyPrice: "", depositAmount: "", condition: "good", region: "", address: "", minDays: "1", maxDays: "30" });
  const [rentForm, setRentForm] = useState({ startDate: "", endDate: "", notes: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [bR, mR] = await Promise.all([
        fetch(`${base}/api/peer-listings`, { headers: h }),
        fetch(`${base}/api/peer-listings/my`, { headers: h }),
      ]);
      if (bR.ok) setListings((await bR.json()).listings || []);
      if (mR.ok) setMyListings((await mR.json()).listings || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addListing = async () => {
    if (!form.title || !form.dailyPrice) { toast({ title: "Sarlavha va narx majburiy", variant: "destructive" }); return; }
    const res = await fetch(`${base}/api/peer-listings`, { method: "POST", headers: h, body: JSON.stringify({ ...form, dailyPrice: Number(form.dailyPrice), depositAmount: Number(form.depositAmount || 0), minDays: Number(form.minDays), maxDays: Number(form.maxDays) }) });
    const d = await res.json();
    if (res.ok) { toast({ title: "E'lon qo'shildi!" }); setShowAddForm(false); load(); }
    else toast({ title: d.error || "Xato", variant: "destructive" });
  };

  const deleteListing = async (id: number) => {
    if (!confirm("E'lonni o'chirmoqchimisiz?")) return;
    const res = await fetch(`${base}/api/peer-listings/${id}`, { method: "DELETE", headers: h });
    if (res.ok) { toast({ title: "E'lon o'chirildi" }); load(); }
  };

  const rentListing = async () => {
    if (!rentForm.startDate || !rentForm.endDate) { toast({ title: "Sanalarni kiriting", variant: "destructive" }); return; }
    const res = await fetch(`${base}/api/peer-listings/${showRentForm.id}/rent`, { method: "POST", headers: h, body: JSON.stringify(rentForm) });
    const d = await res.json();
    if (res.ok) { toast({ title: "Ijara so'rovi yuborildi!", description: `Jami: ${d.totalPrice?.toLocaleString()} UZS` }); setShowRentForm(null); }
    else toast({ title: d.error || "Xato", variant: "destructive" });
  };

  const filtered = listings.filter(l => l.title?.toLowerCase().includes(search.toLowerCase()) || l.category?.toLowerCase().includes(search.toLowerCase()) || l.region?.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Users2 className="text-orange-500" /> Hamshaharlarga Ijara</h1>
            <p className="text-gray-500 mt-1">Qo'shnidan asbob ijaraga oling yoki o'zingiznikini ijaraga bering</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> E'lon qo'shish
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["browse", "my"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${tab === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {t === "browse" ? "Barcha E'lonlar" : "Mening E'lonlarim"}
            </button>
          ))}
        </div>

        {/* Browse tab */}
        {tab === "browse" && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Asbob nomi, kategoriya yoki hudud..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : filtered.length === 0 ? (
              <Card className="text-center py-12"><CardContent><Users2 className="w-12 h-12 text-gray-300 mx-auto mb-2" /><p className="text-gray-400">E'lonlar topilmadi</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((l: any) => {
                  const cond = CONDITIONS[l.condition] || CONDITIONS.good;
                  return (
                    <Card key={l.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{l.title}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${cond.color}`}>{cond.label}</span>
                              {l.category && <span className="text-xs text-gray-400">{l.category}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-orange-500">{(Number(l.daily_price) / 1000).toFixed(0)}K</p>
                            <p className="text-xs text-gray-400">UZS/kun</p>
                          </div>
                        </div>
                        {l.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{l.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                          {l.region && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.region}</span>}
                          <span>Min: {l.min_days} kun</span>
                          {l.deposit_amount > 0 && <span>Kafolat: {(l.deposit_amount / 1000).toFixed(0)}K</span>}
                          <span>Egasi: {l.owner_name}</span>
                        </div>
                        <Button className="w-full bg-orange-500 hover:bg-orange-600" size="sm"
                          disabled={l.owner_id === user?.id}
                          onClick={() => { setShowRentForm(l); setRentForm({ startDate: "", endDate: "", notes: "" }); }}>
                          {l.owner_id === user?.id ? "Bu sizning e'loningiz" : "Ijaraga olish"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* My listings tab */}
        {tab === "my" && (
          myListings.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400">Sizda hali e'lon yo'q</p>
                <Button className="mt-3 bg-orange-500 hover:bg-orange-600" size="sm" onClick={() => setShowAddForm(true)}>E'lon qo'shish</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myListings.map((l: any) => (
                <Card key={l.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{l.title}</h3>
                      <p className="text-sm text-gray-500">{(Number(l.daily_price) / 1000).toFixed(0)}K UZS/kun · {l.rental_count} marta ijaraga berilgan</p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${l.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {l.is_available ? "Mavjud" : "Band"}
                      </span>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => deleteListing(l.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Add form modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
            <Card className="w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Yangi E'lon</CardTitle>
                <button onClick={() => setShowAddForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Sarlavha *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Perforator Bosch..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Kunlik narx (UZS) *</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="50000" value={form.dailyPrice} onChange={e => setForm(f => ({ ...f, dailyPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Garov (UZS)</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="200000" value={form.depositAmount} onChange={e => setForm(f => ({ ...f, depositAmount: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Kategoriya</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Burg'ulash" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Holat</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}>
                      <option value="excellent">A'lo</option>
                      <option value="good">Yaxshi</option>
                      <option value="fair">O'rtacha</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Min. kun</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.minDays} onChange={e => setForm(f => ({ ...f, minDays: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Maks. kun</label>
                    <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.maxDays} onChange={e => setForm(f => ({ ...f, maxDays: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Hudud</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}>
                      <option value="">Tanlang</option>
                      {["Toshkent", "Samarqand", "Buxoro", "Farg'ona", "Namangan", "Andijon"].map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Manzil</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ko'cha, uy raqami" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block">Tavsif</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-16 resize-none" placeholder="Asbob haqida qo'shimcha ma'lumot..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={addListing}>E'lon Qo'shish</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>Bekor</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rent modal */}
        {showRentForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRentForm(null)}>
            <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ijaraga Olish</CardTitle>
                <button onClick={() => setShowRentForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-orange-50 rounded-lg p-3">
                  <p className="font-medium">{showRentForm.title}</p>
                  <p className="text-sm text-gray-500">{(Number(showRentForm.daily_price) / 1000).toFixed(0)}K UZS/kun · Egasi: {showRentForm.owner_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block">Boshlanish sanasi</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={rentForm.startDate} onChange={e => setRentForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Tugash sanasi</label>
                    <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={rentForm.endDate} onChange={e => setRentForm(f => ({ ...f, endDate: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Izoh (ixtiyoriy)</label>
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm h-16 resize-none" value={rentForm.notes} onChange={e => setRentForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                {rentForm.startDate && rentForm.endDate && (
                  <div className="bg-blue-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                      <span>Kunlar:</span>
                      <span className="font-medium">{Math.max(0, Math.ceil((new Date(rentForm.endDate).getTime() - new Date(rentForm.startDate).getTime()) / 86400000))} kun</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ijara:</span>
                      <span className="font-medium">{(Math.max(0, Math.ceil((new Date(rentForm.endDate).getTime() - new Date(rentForm.startDate).getTime()) / 86400000)) * Number(showRentForm.daily_price)).toLocaleString()} UZS</span>
                    </div>
                    {showRentForm.deposit_amount > 0 && <div className="flex justify-between text-gray-500"><span>Garov:</span><span>{Number(showRentForm.deposit_amount).toLocaleString()} UZS</span></div>}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={rentListing}>Tasdiqlash</Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowRentForm(null)}>Bekor</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
