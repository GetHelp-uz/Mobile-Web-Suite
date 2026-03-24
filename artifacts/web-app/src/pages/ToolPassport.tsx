import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Wrench, AlertTriangle, FileText, PackageCheck, ArrowRightLeft, Tag, Phone, MapPin, ExternalLink } from "lucide-react";

const EVENT_TYPE_LABELS: Record<string, string> = {
  rental_started: "Ijara boshlandi",
  rental_returned: "Ijara qaytarildi",
  maintenance_started: "Texnik xizmat boshlandi",
  maintenance_completed: "Texnik xizmat tugadi",
  repair: "Ta'mirlash",
  inspection: "Ko'rik",
  damage: "Shikast",
  note: "Eslatma",
  sold: "Sotildi",
  transferred: "O'tkazildi",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: "Mavjud", color: "bg-green-100 text-green-700" },
  rented: { label: "Ijarada", color: "bg-yellow-100 text-yellow-700" },
  maintenance: { label: "Texnik xizmat", color: "bg-orange-100 text-orange-700" },
};

function EventIcon({ type }: { type: string }) {
  if (type === "repair") return <Wrench size={14} className="text-orange-500"/>;
  if (type === "damage") return <AlertTriangle size={14} className="text-red-500"/>;
  if (type === "note") return <FileText size={14} className="text-gray-400"/>;
  if (type === "transferred") return <ArrowRightLeft size={14} className="text-purple-500"/>;
  if (type === "maintenance_started" || type === "maintenance_completed") return <PackageCheck size={14} className="text-green-500"/>;
  return <ClipboardList size={14} className="text-blue-500"/>;
}

export default function ToolPassport() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!qrCode) return;
    const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
    fetch(`${baseUrl}/api/passport/${qrCode}`)
      .then(r => {
        if (!r.ok) throw new Error("Asbob topilmadi");
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [qrCode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto mb-3"/>
          <p className="text-blue-700 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-red-700 mb-2">Asbob topilmadi</h1>
          <p className="text-red-600 mb-6">{error || "Ushbu QR kod haqida ma'lumot yo'q"}</p>
          <Link to="/">
            <Button variant="outline">Bosh sahifa</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { tool, events = [], stats } = data;
  const st = STATUS_LABELS[tool.status] || { label: tool.status, color: "bg-gray-100 text-gray-700" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">G</span>
            </div>
            <span className="font-bold text-blue-700">GetHelp.uz</span>
          </div>
          <span className="text-xs text-muted-foreground">Asbob Pasporti</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Tool info card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center shrink-0">
                {tool.image_url
                  ? <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover rounded-xl"/>
                  : <span className="text-4xl">🔧</span>}
              </div>
              <div className="flex-1 min-w-0">
                <Badge className={`${st.color} text-xs mb-2`}>{st.label}</Badge>
                <h1 className="font-bold text-xl leading-tight mb-1">{tool.name}</h1>
                <p className="text-sm text-muted-foreground mb-2">{tool.category}</p>
                {tool.description && <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Kunlik narx</p>
                <p className="font-bold text-lg text-blue-800">{Number(tool.price_per_day || 0).toLocaleString()} so'm</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium">Depozit</p>
                <p className="font-bold text-lg text-green-800">{Number(tool.deposit_amount || 0).toLocaleString()} so'm</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop info */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Do'kon ma'lumotlari</h2>
            <p className="font-bold text-base mb-2">{tool.shop_name}</p>
            {tool.shop_address && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin size={13}/> {tool.shop_address}
              </div>
            )}
            {tool.shop_phone && (
              <a href={`tel:+${tool.shop_phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <Phone size={13}/> +{tool.shop_phone}
              </a>
            )}
          </CardContent>
        </Card>

        {/* QR Code */}
        <Card>
          <CardContent className="p-5 flex items-center gap-6">
            <QRCodeSVG
              value={`${window.location.origin}/passport/${qrCode}`}
              size={100}
              level="M"
              includeMargin
            />
            <div className="flex-1">
              <p className="font-semibold mb-1 text-sm">Pasport QR kodi</p>
              <p className="text-xs text-muted-foreground mb-3">Skanerlang va asbob tarixini ko'ring</p>
              <code className="text-xs bg-secondary px-2 py-1 rounded block truncate">{qrCode}</code>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Ijaralar", value: stats?.total_rentals || 0, icon: <ClipboardList size={16}/>, color: "text-blue-600 bg-blue-50" },
            { label: "Ta'mirlar", value: stats?.total_repairs || 0, icon: <Wrench size={16}/>, color: "text-orange-600 bg-orange-50" },
            { label: "Texnik", value: stats?.total_maintenance || 0, icon: <PackageCheck size={16}/>, color: "text-green-600 bg-green-50" },
            { label: "Xarajat", value: `${Number(stats?.total_maintenance_cost||0).toLocaleString()}`, icon: <Tag size={16}/>, color: "text-purple-600 bg-purple-50" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className={`p-3 text-center ${s.color.split(" ")[1]}`}>
                <div className={`flex justify-center mb-1 ${s.color.split(" ")[0]}`}>{s.icon}</div>
                <p className="font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Events */}
        <Card>
          <CardContent className="p-5">
            <h2 className="font-semibold mb-4">Voqealar tarixi</h2>
            {events.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground py-8">Hali voqealar qayd etilmagan</p>
            ) : (
              <div className="space-y-3">
                {events.map((ev: any) => (
                  <div key={ev.id} className="flex gap-3 p-3 border rounded-lg">
                    <div className="mt-0.5 shrink-0"><EventIcon type={ev.event_type}/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{ev.title}</p>
                        <span className="shrink-0 text-xs bg-secondary px-2 py-0.5 rounded">
                          {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                        </span>
                      </div>
                      {ev.description && <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{new Date(ev.created_at).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {ev.performed_by && <span>Bajaruvchi: {ev.performed_by}</span>}
                        {ev.cost && <span className="text-orange-600 font-medium">{Number(ev.cost).toLocaleString()} so'm</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center py-4 text-xs text-muted-foreground">
          <p>GetHelp.uz tomonidan quvvatlanadi</p>
          <a href="/" className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1">
            <ExternalLink size={11}/> gethelp.uz ga o'tish
          </a>
        </div>
      </div>
    </div>
  );
}
