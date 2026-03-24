import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search, MapPin, Tag, SlidersHorizontal, Star, Grid3X3, List,
  ChevronLeft, ChevronRight, X, Heart, ShoppingCart
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Barchasi", "Burg'ulash", "Kesish", "Qazish", "Lift", "Generator",
  "Betomlashtirish", "Bo'yash", "Payvandlash", "Lesa", "Nasos", "O'lchash",
];

const REGIONS = [
  "Barcha hududlar", "Toshkent", "Samarqand", "Buxoro", "Namangan",
  "Andijon", "Farg'ona", "Qashqadaryo", "Surxandaryo", "Xorazm",
];

const SORTS = [
  { label: "Eng arzon", value: "price_asc" },
  { label: "Eng qimmat", value: "price_desc" },
  { label: "Nom bo'yicha", value: "name_asc" },
  { label: "Reyting bo'yicha", value: "rating_desc" },
];

const PAGE_SIZE = 12;

export default function BrowseTools() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [tools, setTools] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Barchasi");
  const [region, setRegion] = useState("Barcha hududlar");
  const [sort, setSort] = useState("price_asc");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const loadTools = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      if (search) params.set("search", search);
      if (category !== "Barchasi") params.set("category", category);
      if (region !== "Barcha hududlar") params.set("region", region);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (onlyAvailable) params.set("status", "available");
      if (sort === "price_asc") params.set("sortBy", "price_asc");
      else if (sort === "price_desc") params.set("sortBy", "price_desc");
      else if (sort === "name_asc") params.set("sortBy", "name");
      else if (sort === "rating_desc") params.set("sortBy", "rating");

      const res = await fetch(`${baseUrl}/api/tools?${params}`, { headers: h });
      const data = await res.json();
      let fetchedTools = data.tools || [];

      // Client-side sort fallback
      if (sort === "price_asc") fetchedTools.sort((a: any, b: any) => a.pricePerDay - b.pricePerDay);
      else if (sort === "price_desc") fetchedTools.sort((a: any, b: any) => b.pricePerDay - a.pricePerDay);
      else if (sort === "name_asc") fetchedTools.sort((a: any, b: any) => a.name.localeCompare(b.name));

      // Client side filter as fallback
      let filtered = fetchedTools;
      if (search) filtered = filtered.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()) || t.category?.toLowerCase().includes(search.toLowerCase()));
      if (category !== "Barchasi") filtered = filtered.filter((t: any) => t.category?.toLowerCase().includes(category.toLowerCase()));
      if (onlyAvailable) filtered = filtered.filter((t: any) => t.status === "available");
      if (minPrice) filtered = filtered.filter((t: any) => t.pricePerDay >= Number(minPrice));
      if (maxPrice) filtered = filtered.filter((t: any) => t.pricePerDay <= Number(maxPrice));

      setTotal(data.total || filtered.length);
      setTools(filtered);
    } catch {
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, category, region, sort, minPrice, maxPrice, onlyAvailable]);

  useEffect(() => {
    loadTools();
  }, [page, search, category, region, sort, minPrice, maxPrice, onlyAvailable]);

  const toggleFavorite = async (toolId: number) => {
    const isFav = favorites.has(toolId);
    try {
      await fetch(`${baseUrl}/api/favorites/${toolId}`, { method: isFav ? "DELETE" : "POST", headers: h });
      setFavorites(prev => {
        const next = new Set(prev);
        isFav ? next.delete(toolId) : next.add(toolId);
        return next;
      });
      toast({ title: isFav ? "Sevimlilardan olindi" : "Sevimlilarga qo'shildi!" });
    } catch {}
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeFilters = [
    category !== "Barchasi" && category,
    region !== "Barcha hududlar" && region,
    minPrice && `min: ${formatCurrency(Number(minPrice))}`,
    maxPrice && `max: ${formatCurrency(Number(maxPrice))}`,
    onlyAvailable && "Faqat mavjud",
  ].filter(Boolean) as string[];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-display font-bold mb-2">Asboblar katalogi</h1>
        <p className="text-muted-foreground">O'zingizga kerakli asbobni toping va ijara oling</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Qidiruv: burg'u, generator, lesa..."
            className="pl-11 h-12 rounded-xl"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          className="h-12 gap-2 px-5"
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal size={17} />
          Filtrlar
          {activeFilters.length > 0 && (
            <span className="bg-white text-primary rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
              {activeFilters.length}
            </span>
          )}
        </Button>
        <div className="flex gap-1 border rounded-xl p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            <Grid3X3 size={17} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted"}`}
          >
            <List size={17} />
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="mb-5 border-primary/20">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Hudud</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                >
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Saralash</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                >
                  {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block uppercase tracking-wide">Narx oralig'i (so'm/kun)</label>
                <div className="flex gap-2">
                  <Input placeholder="Min" type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="h-9" />
                  <Input placeholder="Max" type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="h-9" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)} className="w-4 h-4 accent-primary" />
                <span className="text-sm font-medium">Faqat mavjud asboblar</span>
              </label>
              {activeFilters.length > 0 && (
                <Button size="sm" variant="ghost" className="ml-auto text-muted-foreground" onClick={() => {
                  setCategory("Barchasi"); setRegion("Barcha hududlar"); setMinPrice(""); setMaxPrice(""); setOnlyAvailable(false);
                }}>
                  <X size={14} className="mr-1" /> Hammasini tozalash
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all ${
              category === cat
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {activeFilters.map(f => (
            <Badge key={f} variant="secondary" className="gap-1 pr-1">
              {f}
              <button className="ml-1 hover:text-destructive" onClick={() => {
                if (f === category) setCategory("Barchasi");
                else if (f === region) setRegion("Barcha hududlar");
                else if (f === "Faqat mavjud") setOnlyAvailable(false);
                else if (f.startsWith("min:")) setMinPrice("");
                else if (f.startsWith("max:")) setMaxPrice("");
              }}>
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Results summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? "Qidirilmoqda..." : `${tools.length} ta asbob topildi`}
        </p>
      </div>

      {/* Tools grid / list */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" : "space-y-4"}>
          {[...Array(8)].map((_, i) => (
            <Card key={i} className={`animate-pulse bg-muted ${viewMode === "grid" ? "h-72" : "h-24"}`} />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="text-center py-20">
          <Search size={60} className="mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="text-xl font-bold mb-2">Asbob topilmadi</h3>
          <p className="text-muted-foreground mb-4">Filtrlarni o'zgartirib ko'ring</p>
          <Button onClick={() => { setCategory("Barchasi"); setSearch(""); setOnlyAvailable(false); setMinPrice(""); setMaxPrice(""); }}>
            Filtrlarni tozalash
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {tools.map(tool => (
            <Card key={tool.id} className="group overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-300">
              <div className="relative h-44 bg-secondary flex items-center justify-center overflow-hidden">
                <img
                  src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`}
                  alt={tool.name}
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 p-4"
                />
                <div className="absolute top-3 left-3">
                  <Badge variant={tool.status === "available" ? "success" : tool.status === "rented" ? "warning" : "destructive"} className="text-xs">
                    {tool.status === "available" ? "Mavjud" : tool.status === "rented" ? "Ijarada" : "Ta'mirda"}
                  </Badge>
                </div>
                <button
                  onClick={() => toggleFavorite(tool.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-card rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                >
                  <Heart className={`h-4 w-4 ${favorites.has(tool.id) ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
                </button>
              </div>
              <CardContent className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mb-1">
                  <Tag size={11} /> {tool.category}
                </div>
                <h3 className="font-bold text-base mb-1 line-clamp-2 leading-tight">{tool.name}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <MapPin size={11} /> {tool.shopName || "Hamkor do'kon"}
                </div>
                {tool.averageRating > 0 && (
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-medium">{Number(tool.averageRating).toFixed(1)}</span>
                  </div>
                )}
                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Kunlik</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(tool.pricePerDay)}</p>
                  </div>
                  <Link href={`/tools/${tool.id}`}>
                    <Button size="sm" variant={tool.status === "available" ? "default" : "secondary"} disabled={tool.status !== "available"} className="gap-1">
                      <ShoppingCart size={14} />
                      {tool.status === "available" ? "Ijara" : "Mavjud emas"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map(tool => (
            <Card key={tool.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center gap-5">
                <div className="w-20 h-20 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img
                    src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`}
                    alt={tool.name}
                    className="max-h-full max-w-full object-contain p-2"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-base">{tool.name}</h3>
                    <Badge variant={tool.status === "available" ? "success" : "warning"} className="text-xs">
                      {tool.status === "available" ? "Mavjud" : "Ijarada"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Tag size={12} /> {tool.category}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {tool.shopName || "Do'kon"}</span>
                    {tool.averageRating > 0 && (
                      <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400" /> {Number(tool.averageRating).toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Kunlik narx</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(tool.pricePerDay)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => toggleFavorite(tool.id)} className="p-2 rounded-lg border hover:bg-red-50 transition-colors">
                      <Heart className={`h-4 w-4 ${favorites.has(tool.id) ? "text-red-500 fill-red-500" : "text-muted-foreground"}`} />
                    </button>
                    <Link href={`/tools/${tool.id}`}>
                      <Button size="sm" disabled={tool.status !== "available"}>Ijara olish</Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft size={16} />
          </Button>
          {[...Array(Math.min(totalPages, 7))].map((_, i) => {
            const p = i + 1;
            return (
              <Button key={p} size="sm" variant={page === p ? "default" : "outline"} onClick={() => setPage(p)}>
                {p}
              </Button>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}
