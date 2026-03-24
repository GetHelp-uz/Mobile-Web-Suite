import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Building2, FileText, CheckCircle, Clock, AlertCircle, Send } from "lucide-react";

export default function B2BPortalPage() {
  const { toast } = useToast();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("gethelp_token") || ""}` };
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [profile, setProfile] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ companyName: "", companyInn: "", contactPerson: "", contactPhone: "", contactEmail: "", address: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [pR, cR] = await Promise.all([
        fetch(`${base}/api/b2b/my-profile`, { headers: h }),
        fetch(`${base}/api/b2b/contracts`, { headers: h }),
      ]);
      if (pR.ok) setProfile((await pR.json()).profile);
      if (cR.ok) setContracts((await cR.json()).contracts || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.companyName || !form.contactPerson || !form.contactPhone) {
      toast({ title: "Majburiy maydonlarni to'ldiring", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/b2b/register`, { method: "POST", headers: h, body: JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { toast({ title: d.message }); setShowForm(false); load(); }
      else toast({ title: d.error || "Xato", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="text-orange-500" /> B2B Portali</h1>
          <p className="text-gray-500 mt-1">Korporativ ijarachilar uchun maxsus narx va to'lov shartlari</p>
        </div>

        {/* Afzalliklar */}
        {!profile && !showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: "💰", title: "Maxsus chegirma", desc: "Verifikatsiyadan o'tgan kompaniyalar uchun 5-20% chegirma" },
              { icon: "📋", title: "Kredit limit", desc: "Oyiga belgilangan limitgacha oldin oling, keyin to'lang" },
              { icon: "📄", title: "Rasmiy shartnoma", desc: "Kompaniya nomiga rasmiy shartnoma va hisob-faktura" },
            ].map((f, i) => (
              <Card key={i} className="text-center p-5">
                <p className="text-4xl mb-2">{f.icon}</p>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </Card>
            ))}
          </div>
        )}

        {/* Profil holati */}
        {loading ? <p className="text-gray-400">Yuklanmoqda...</p> : profile ? (
          <Card className={`border-2 ${profile.is_verified ? 'border-green-400 bg-green-50' : 'border-yellow-400 bg-yellow-50'}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile.is_verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {profile.is_verified ? <CheckCircle className="w-6 h-6 text-green-600" /> : <Clock className="w-6 h-6 text-yellow-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{profile.company_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile.is_verified ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                      {profile.is_verified ? "Tasdiqlangan" : "Ko'rib chiqilmoqda"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
                    <div><p className="text-gray-400">Mas'ul shaxs</p><p className="font-medium">{profile.contact_person}</p></div>
                    <div><p className="text-gray-400">Telefon</p><p className="font-medium">{profile.contact_phone}</p></div>
                    {profile.is_verified && <>
                      <div><p className="text-gray-400">Chegirma</p><p className="font-medium text-green-600">{profile.discount_percent}%</p></div>
                      <div><p className="text-gray-400">Kredit limit</p><p className="font-medium">{Number(profile.credit_limit || 0).toLocaleString()} UZS</p></div>
                    </>}
                  </div>
                  {!profile.is_verified && <p className="text-sm text-yellow-700 mt-2">⏳ Ariza ko'rib chiqilmoqda. 1-2 ish kuni ichida javob beramiz.</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-2 border-dashed border-orange-300">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-orange-300 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">B2B Ariza Bering</h3>
              <p className="text-gray-500 text-sm mb-4">Kompaniyangiz ma'lumotlarini kiriting, biz sizga maxsus shartlar taklif qilamiz</p>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowForm(true)}>
                <Send className="w-4 h-4 mr-2" /> Ariza Berish
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Ariza shakli */}
        {showForm && (
          <Card>
            <CardHeader><CardTitle>B2B Ariza</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "companyName", label: "Kompaniya nomi *", placeholder: "OOO \"Qurilish Pro\"" },
                  { key: "companyInn", label: "INN (STIR)", placeholder: "123456789" },
                  { key: "contactPerson", label: "Mas'ul shaxs *", placeholder: "Ismingiz Familiyangiz" },
                  { key: "contactPhone", label: "Telefon *", placeholder: "+998 90 123 45 67" },
                  { key: "contactEmail", label: "Email", placeholder: "info@company.uz" },
                  { key: "address", label: "Manzil", placeholder: "Toshkent, ..." },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-sm font-medium block mb-1">{f.label}</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={f.placeholder}
                      value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button onClick={submit} disabled={submitting} className="bg-orange-500 hover:bg-orange-600">
                  {submitting ? "Yuborilmoqda..." : "Ariza Yuborish"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Bekor</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Shartnomalar */}
        {contracts.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><FileText className="w-5 h-5" /> Shartnomalar</h2>
            <div className="space-y-3">
              {contracts.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{c.contract_number}</p>
                      <p className="text-sm text-gray-500">{c.shop_name} · {c.start_date} — {c.end_date}</p>
                      {c.monthly_limit && <p className="text-sm text-blue-600">Limit: {Number(c.monthly_limit).toLocaleString()} UZS/oy</p>}
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status === 'active' ? 'Faol' : 'Tugagan'}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
