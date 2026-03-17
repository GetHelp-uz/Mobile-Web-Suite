import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  MapPin, Satellite, Plus, Trash2, Link, Unlink, Battery, Wifi,
  Navigation, Clock, RefreshCw, Activity, Shield, Map
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";

// Leaflet default icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const GPS_MODELS = ["TK103", "GT06N", "TK110", "Coban GPS", "Concox GT710", "Queclink GV55", "Boshqa"];

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 15, { animate: true, duration: 1 });
  }, [lat, lng, map]);
  return null;
}

const createToolIcon = (isOnline: boolean, isRented: boolean) =>
  L.divIcon({
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${isRented ? "#ef4444" : isOnline ? "#22c55e" : "#94a3b8"};
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;font-size:18px">
      ${isRented ? "🔧" : "📍"}
    </div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

export default function ShopGPS() {
  const { user } = useAuth();
  const { toast } = useToast();
  const shopId = user?.shopId || 0;
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

  const [devices, setDevices] = useState<any[]>([]);
  const [liveDevices, setLiveDevices] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [focusedPos, setFocusedPos] = useState<{ lat: number; lng: number } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [geofenceOpen, setGeofenceOpen] = useState(false);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simDevice, setSimDevice] = useState<any>(null);

  const [form, setForm] = useState({
    deviceName: "", serialNumber: "", model: "TK103", simNumber: "", toolId: ""
  });
  const [geoForm, setGeoForm] = useState({ name: "", centerLat: "", centerLng: "", radiusMeters: "500", deviceId: "" });
  const [simForm, setSimForm] = useState({ lat: "41.2995", lng: "69.2401", speed: "0", battery: "85" });

  // Toshkent markazi boshlang'ich pozitsiya
  const DEFAULT_CENTER: [number, number] = [41.2995, 69.2401];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [devR, liveR, toolsR, geoR] = await Promise.all([
        fetch(`${baseUrl}/api/gps/devices/shop/${shopId}`, { headers: h }),
        fetch(`${baseUrl}/api/gps/monitoring/${shopId}`, { headers: h }),
        fetch(`${baseUrl}/api/shops/${shopId}/tools?limit=200`, { headers: h }),
        fetch(`${baseUrl}/api/gps/geofences/shop/${shopId}`, { headers: h }),
      ]);
      const devD = await devR.json();
      const liveD = await liveR.json();
      const toolsD = await toolsR.json();
      const geoD = await geoR.json();
      setDevices(devD.devices || []);
      setLiveDevices(liveD.devices || []);
      setTools(toolsD.tools || []);
      setGeofences(geoD.geofences || []);
    } finally { setLoading(false); }
  }, [shopId, baseUrl]);

  useEffect(() => { load(); }, [load]);

  // Avtomatik yangilash (30 soniyada bir)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${baseUrl}/api/gps/monitoring/${shopId}`, { headers: h })
        .then(r => r.json()).then(d => setLiveDevices(d.devices || []));
    }, 30000);
    return () => clearInterval(interval);
  }, [shopId]);

  const loadHistory = async (deviceId: number) => {
    const r = await fetch(`${baseUrl}/api/gps/history/${deviceId}?limit=100`, { headers: h });
    const d = await r.json();
    setHistory(d.history || []);
  };

  const addDevice = async () => {
    try {
      const r = await fetch(`${baseUrl}/api/gps/devices`, {
        method: "POST", headers: h,
        body: JSON.stringify({ shopId, ...form, toolId: form.toolId ? Number(form.toolId) : null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "GPS qurilma qo'shildi!", description: `Serial: ${d.device.serial_number}` });
      setAddOpen(false);
      setForm({ deviceName: "", serialNumber: "", model: "TK103", simNumber: "", toolId: "" });
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const unlinkDevice = async (deviceId: number) => {
    await fetch(`${baseUrl}/api/gps/devices/${deviceId}/unlink`, { method: "PATCH", headers: h });
    toast({ title: "Ajratildi" });
    load();
  };

  const deleteDevice = async (deviceId: number) => {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    await fetch(`${baseUrl}/api/gps/devices/${deviceId}`, { method: "DELETE", headers: h });
    toast({ title: "O'chirildi" });
    load();
  };

  const addGeofence = async () => {
    try {
      const r = await fetch(`${baseUrl}/api/gps/geofences`, {
        method: "POST", headers: h,
        body: JSON.stringify({ shopId, ...geoForm, centerLat: Number(geoForm.centerLat), centerLng: Number(geoForm.centerLng), radiusMeters: Number(geoForm.radiusMeters) }),
      });
      if (!r.ok) throw new Error("Xatolik");
      toast({ title: "Geofence yaratildi!" });
      setGeofenceOpen(false);
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const simulate = async () => {
    if (!simDevice) return;
    try {
      const r = await fetch(`${baseUrl}/api/gps/simulate`, {
        method: "POST", headers: h,
        body: JSON.stringify({ deviceId: simDevice.id, ...simForm }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: "Joylashuv simulyatsiya qilindi!", description: `${simForm.lat}, ${simForm.lng}` });
      setSimulateOpen(false);
      load();
    } catch (err: any) { toast({ title: "Xatolik", description: err.message, variant: "destructive" }); }
  };

  const isOnline = (device: any) => {
    if (!device.last_seen) return false;
    return (Date.now() - new Date(device.last_seen).getTime()) < 5 * 60 * 1000; // 5 daqiqa
  };

  const unlinkedTools = tools.filter(t => !t.gps_device_id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Satellite className="h-6 w-6 text-primary" /> GPS Monitoring
            </h1>
            <p className="text-muted-foreground">Asboblarni real vaqtda kuzatish tizimi</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Yangilash
            </Button>
            <Button variant="outline" onClick={() => setGeofenceOpen(true)}>
              <Shield className="h-4 w-4 mr-2" /> Geofence
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> GPS Qurilma qo'shish
            </Button>
          </div>
        </div>

        {/* Statistika */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Satellite className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-blue-700">{devices.length}</div>
                <div className="text-xs text-blue-600">Jami qurilmalar</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Activity className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">{devices.filter(isOnline).length}</div>
                <div className="text-xs text-green-600">Onlayn</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Navigation className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-orange-700">{liveDevices.filter(d => d.rental_id).length}</div>
                <div className="text-xs text-orange-600">Ijaradagi</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold text-purple-700">{geofences.length}</div>
                <div className="text-xs text-purple-600">Geofence</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="map">
          <TabsList className="mb-4">
            <TabsTrigger value="map"><Map className="h-4 w-4 mr-2" /> Xarita</TabsTrigger>
            <TabsTrigger value="devices"><Satellite className="h-4 w-4 mr-2" /> Qurilmalar</TabsTrigger>
            <TabsTrigger value="history"><Clock className="h-4 w-4 mr-2" /> Tarix</TabsTrigger>
          </TabsList>

          {/* XARITA TAB */}
          <TabsContent value="map">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Qurilmalar ro'yxati (xarita yonida) */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {liveDevices.length === 0 ? (
                  <Card><CardContent className="p-6 text-center text-muted-foreground">
                    <MapPin className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">GPS joylashuvi yo'q</p>
                    <p className="text-xs mt-1">Qurilmalar ping yuborishi kerak</p>
                  </CardContent></Card>
                ) : (
                  liveDevices.map(d => (
                    <Card key={d.id}
                      className={`cursor-pointer border-2 transition-all ${selectedDevice?.id === d.id ? "border-primary" : "border-transparent hover:border-muted-foreground/30"}`}
                      onClick={() => {
                        setSelectedDevice(d);
                        if (d.last_lat && d.last_lng) setFocusedPos({ lat: d.last_lat, lng: d.last_lng });
                        loadHistory(d.id);
                      }}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${isOnline(d) ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                            <div>
                              <div className="font-medium text-sm">{d.device_name}</div>
                              <div className="text-xs text-muted-foreground">{d.tool_name || "Asbobsiz"}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Battery className="h-3 w-3" /> {d.last_battery}%
                            </span>
                            {d.last_speed > 0 && (
                              <span className="text-xs text-blue-600">{Math.round(d.last_speed)} km/h</span>
                            )}
                          </div>
                        </div>
                        {d.rental_id && (
                          <div className="mt-1.5 text-xs bg-red-50 text-red-700 rounded px-2 py-0.5">
                            Ijarada: {d.renter_name}
                          </div>
                        )}
                        {d.last_seen && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(d.last_seen).toLocaleString("uz-UZ")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Xarita */}
              <div className="lg:col-span-2 rounded-xl overflow-hidden border border-border" style={{ height: "600px" }}>
                <MapContainer center={focusedPos ? [focusedPos.lat, focusedPos.lng] : DEFAULT_CENTER} zoom={12} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {focusedPos && <MapFlyTo lat={focusedPos.lat} lng={focusedPos.lng} />}

                  {/* Geofence doiralari */}
                  {geofences.map(gf => (
                    <Circle key={gf.id} center={[gf.center_lat, gf.center_lng]} radius={gf.radius_meters}
                      color="#8b5cf6" fillColor="#8b5cf6" fillOpacity={0.1} weight={2} dashArray="8,4">
                      <Popup><strong>{gf.name}</strong><br />Radius: {gf.radius_meters}m</Popup>
                    </Circle>
                  ))}

                  {/* GPS markerlar */}
                  {liveDevices.filter(d => d.last_lat && d.last_lng).map(d => (
                    <Marker key={d.id}
                      position={[d.last_lat, d.last_lng]}
                      icon={createToolIcon(isOnline(d), !!d.rental_id)}
                      eventHandlers={{ click: () => { setSelectedDevice(d); loadHistory(d.id); } }}>
                      <Popup>
                        <div className="min-w-[180px]">
                          <div className="font-bold">{d.device_name}</div>
                          {d.tool_name && <div className="text-sm text-gray-600">🔧 {d.tool_name}</div>}
                          {d.rental_id && <div className="text-sm text-red-600">Ijarada: {d.renter_name}</div>}
                          <div className="text-xs text-gray-500 mt-1">
                            Tezlik: {Math.round(d.last_speed || 0)} km/h<br />
                            Batareya: {d.last_battery}%<br />
                            {new Date(d.last_seen).toLocaleString("uz-UZ")}
                          </div>
                          <button
                            onClick={() => { setSimDevice(d); setSimulateOpen(true); }}
                            className="mt-2 w-full text-xs bg-primary text-white rounded px-2 py-1">
                            Test signal yuborish
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </TabsContent>

          {/* QURILMALAR TAB */}
          <TabsContent value="devices">
            <div className="space-y-3">
              {devices.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Satellite className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg">GPS qurilmalar yo'q</p>
                  <p className="text-sm mt-1">Birinchi qurilmani qo'shing</p>
                  <Button className="mt-4" onClick={() => setAddOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> GPS Qurilma qo'shish
                  </Button>
                </div>
              ) : devices.map(d => (
                <Card key={d.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOnline(d) ? "bg-green-100" : "bg-muted"}`}>
                          <Satellite className={`h-6 w-6 ${isOnline(d) ? "text-green-600" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{d.device_name}</span>
                            <Badge variant={isOnline(d) ? "default" : "secondary"} className={isOnline(d) ? "bg-green-600" : ""}>
                              {isOnline(d) ? "Onlayn" : "Oflayn"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {d.model} • {d.serial_number}
                            {d.sim_number && ` • SIM: ${d.sim_number}`}
                          </div>
                          <div className="text-sm mt-1">
                            {d.tool_name ? (
                              <span className="flex items-center gap-1 text-green-700">
                                <Link className="h-3.5 w-3.5" /> {d.tool_name}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Asbobga ulanmagan</span>
                            )}
                          </div>
                          {d.last_lat && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{d.last_lat.toFixed(4)}, {d.last_lng.toFixed(4)}</span>
                              <span className="flex items-center gap-1"><Battery className="h-3 w-3" />{d.last_battery}%</span>
                              {d.last_speed > 0 && <span><Navigation className="h-3 w-3 inline" /> {Math.round(d.last_speed)} km/h</span>}
                              {d.last_seen && <span><Clock className="h-3 w-3 inline" /> {new Date(d.last_seen).toLocaleString("uz-UZ")}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSimDevice(d);
                          setSimulateOpen(true);
                        }}>
                          Test signal
                        </Button>
                        {d.tool_id && (
                          <Button variant="outline" size="sm" onClick={() => unlinkDevice(d.id)}>
                            <Unlink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteDevice(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* TARIX TAB */}
          <TabsContent value="history">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold mb-3 text-sm">Qurilmani tanlang:</h3>
                <div className="space-y-2">
                  {devices.map(d => (
                    <button key={d.id}
                      className={`w-full text-left p-3 border rounded-xl text-sm transition-all ${selectedDevice?.id === d.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
                      onClick={() => { setSelectedDevice(d); loadHistory(d.id); }}>
                      <div className="font-medium">{d.device_name}</div>
                      <div className="text-xs text-muted-foreground">{d.tool_name || "Asbobsiz"}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                {!selectedDevice ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Qurilmani tanlang</p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Tarix yo'q</p>
                  </div>
                ) : (
                  <div className="rounded-xl border overflow-hidden" style={{ height: 400 }}>
                    <MapContainer center={[history[history.length - 1]?.lat || 41.2995, history[history.length - 1]?.lng || 69.2401]} zoom={13} style={{ height: "100%", width: "100%" }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {history.map((h, i) => (
                        <Marker key={i} position={[h.lat, h.lng]}
                          icon={L.divIcon({
                            html: `<div style="width:8px;height:8px;border-radius:50%;background:${i === history.length - 1 ? "#3b82f6" : "#94a3b8"};border:2px solid white"></div>`,
                            className: "", iconSize: [8, 8], iconAnchor: [4, 4],
                          })}>
                          <Popup>
                            <div className="text-xs">
                              <div>{new Date(h.created_at).toLocaleString("uz-UZ")}</div>
                              <div>Tezlik: {Math.round(h.speed || 0)} km/h</div>
                              <div>Batareya: {h.battery}%</div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                )}
                {history.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                    {history.slice(-10).reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30">
                        <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("uz-UZ")}</span>
                        <span>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                        <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{Math.round(h.speed || 0)} km/h</span>
                        <span className="flex items-center gap-1"><Battery className="h-3 w-3" />{h.battery}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* GPS Qurilma qo'shish */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Satellite className="h-5 w-5" /> Yangi GPS Qurilma</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl text-sm text-blue-700">
              <strong>Qo'llab-quvvatlanadigan qurilmalar:</strong> TK103, GT06N, TK110, Coban GPS va boshqa GPRS-GPS trackerlar. Qurilma server manziliga `POST /api/gps/ping` yuborishi kerak.
            </div>
            <div>
              <label className="text-sm font-medium">Qurilma nomi *</label>
              <Input placeholder="Masalan: Perforator GPS #1" value={form.deviceName} onChange={e => setForm(p => ({ ...p, deviceName: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Serial raqam / IMEI *</label>
              <Input placeholder="869123456789012" value={form.serialNumber} onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))} className="mt-1 font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Model</label>
                <Select value={form.model} onValueChange={v => setForm(p => ({ ...p, model: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{GPS_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">SIM raqam</label>
                <Input placeholder="+998..." value={form.simNumber} onChange={e => setForm(p => ({ ...p, simNumber: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Asbobga ulash (ixtiyoriy)</label>
              <Select value={form.toolId} onValueChange={v => setForm(p => ({ ...p, toolId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Asbobni tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Hozircha ulashmaslik</SelectItem>
                  {unlinkedTools.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Bekor</Button>
            <Button onClick={addDevice}>Qo'shish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geofence qo'shish */}
      <Dialog open={geofenceOpen} onOpenChange={setGeofenceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Geofence Zona</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl text-sm text-purple-700">
              Geofence — ruxsat etilgan zona. Asbob zonadan chiqsa, sizga bildirishnoma keladi.
            </div>
            <div>
              <label className="text-sm font-medium">Zona nomi *</label>
              <Input placeholder="Masalan: Do'kon atrofi" value={geoForm.name} onChange={e => setGeoForm(p => ({ ...p, name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Markaziy lat</label>
                <Input type="number" step="0.0001" placeholder="41.2995" value={geoForm.centerLat} onChange={e => setGeoForm(p => ({ ...p, centerLat: e.target.value }))} className="mt-1 font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium">Markaziy lng</label>
                <Input type="number" step="0.0001" placeholder="69.2401" value={geoForm.centerLng} onChange={e => setGeoForm(p => ({ ...p, centerLng: e.target.value }))} className="mt-1 font-mono" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Radius (metr)</label>
              <Input type="number" placeholder="500" value={geoForm.radiusMeters} onChange={e => setGeoForm(p => ({ ...p, radiusMeters: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGeofenceOpen(false)}>Bekor</Button>
            <Button onClick={addGeofence}>Yaratish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulyatsiya */}
      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Signal Yuborish</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-xl text-sm text-yellow-700">
              Bu haqiqiy GPS qurilma o'rniga test joylashuv ma'lumotlari yuboradi. <strong>{simDevice?.device_name}</strong> uchun test.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <Input type="number" step="0.0001" value={simForm.lat} onChange={e => setSimForm(p => ({ ...p, lat: e.target.value }))} className="mt-1 font-mono" />
              </div>
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <Input type="number" step="0.0001" value={simForm.lng} onChange={e => setSimForm(p => ({ ...p, lng: e.target.value }))} className="mt-1 font-mono" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Tezlik (km/h)</label>
                <Input type="number" value={simForm.speed} onChange={e => setSimForm(p => ({ ...p, speed: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Batareya (%)</label>
                <Input type="number" max={100} value={simForm.battery} onChange={e => setSimForm(p => ({ ...p, battery: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <button className="p-2 border rounded hover:bg-muted" onClick={() => setSimForm(p => ({ ...p, lat: "41.2995", lng: "69.2401" }))}>Toshkent markazi</button>
              <button className="p-2 border rounded hover:bg-muted" onClick={() => setSimForm(p => ({ ...p, lat: "41.3200", lng: "69.2500" }))}>Yunusobod</button>
              <button className="p-2 border rounded hover:bg-muted" onClick={() => setSimForm(p => ({ ...p, lat: "41.2800", lng: "69.2200" }))}>Mirzo Ulugbek</button>
              <button className="p-2 border rounded hover:bg-muted" onClick={() => setSimForm(p => ({ ...p, lat: "41.3500", lng: "69.3000" }))}>Sergeli</button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSimulateOpen(false)}>Bekor</Button>
            <Button onClick={simulate}>Signal yuborish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
