import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Sparkles, Search, ArrowRight, Clock, Star, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const PROJECT_ICONS: Record<string, string> = {
  uy_qurish: "🏗️", pol_tashlash: "⬛", gidravlika: "🚿",
  elektrr: "⚡", tomir: "🧱", devor: "🧱", tomchi: "🏠",
  pardozlash: "🎨", yiqitish: "💥", default: "🔧"
};

export default function AIRecommendPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const token = localStorage.getItem("gethelp_token") || "";
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    fetch(`${baseUrl}/api/ai/categories`, { headers: h })
      .then(r => r.json()).then(d => setProjectTypes(d.projectTypes || []));
  }, []);

  const recommend = async () => {
    if (!selectedType && !description) return;
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/api/ai/recommend`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          projectType: selectedType,
          projectDescription: description,
          userId: user?.userId,
        }),
      });
      const d = await r.json();
      setResult(d);
      setStep(2);
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setStep(1); setSelectedType(""); setDescription(""); };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">AI Asbob Tavsiyachi</h1>
          <p className="text-muted-foreground mt-2">Loyihangiz turini kiriting — AI sizga kerakli asboblarni tanlaydi</p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            {/* Loyiha turini tanlash */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-4">1. Loyiha turini tanlang</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {projectTypes.map(pt => (
                    <button key={pt.key}
                      onClick={() => setSelectedType(pt.key)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        selectedType === pt.key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/40"
                      }`}>
                      <div className="text-2xl mb-1">{pt.icon}</div>
                      <div className="font-semibold text-sm">{pt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{pt.description}</div>
                      {selectedType === pt.key && (
                        <CheckCircle className="h-4 w-4 text-primary mt-2" />
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Batafsil tavsif */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-lg mb-2">2. Batafsil tasvirlab bering (ixtiyoriy)</h2>
                <p className="text-sm text-muted-foreground mb-3">Qanday ish qilmoqchisiz? AI aniqroq natija beradi.</p>
                <Input
                  placeholder="Masalan: 3 qavatli uy qurmoqchiman, poydevor quyish kerak..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    "Uy qurmoqchiman", "Vannaxona ta'mirlash", "Pol plitka tashlash",
                    "Elektr o'tkazish", "Deraza o'rnatish", "Devor suvash"
                  ].map(hint => (
                    <button key={hint}
                      className="text-xs px-3 py-1 bg-muted hover:bg-muted/80 rounded-full transition-all"
                      onClick={() => setDescription(hint)}>
                      {hint}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full h-12 text-base"
              onClick={recommend}
              disabled={loading || (!selectedType && !description)}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 animate-pulse" /> AI tahlil qilmoqda...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> Asboblarni tavsiya qiling
                  <ArrowRight className="h-5 w-5" />
                </span>
              )}
            </Button>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-5">
            {/* AI javobi */}
            <Card className="border-primary/30 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{PROJECT_ICONS[result.detectedType] || "🔧"}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-bold text-primary">AI tavsiyasi</span>
                    </div>
                    <p className="text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: result.aiMessage?.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") || ""
                      }}
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {result.recommendedCategories?.map((cat: string) => (
                        <Badge key={cat} variant="secondary">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Topilgan asboblar */}
            <div>
              <h2 className="font-bold text-lg mb-3">
                Mos asboblar ({result.tools?.length || 0} ta)
              </h2>
              {result.tools?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                  <p>Mos asboblar topilmadi</p>
                  <p className="text-sm mt-1">Do'konlar ro'yxatiga qarang</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.tools.map((tool: any) => (
                    <Card key={tool.id} className="hover:shadow-md transition-all cursor-pointer"
                      onClick={() => navigate(`/tools/${tool.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex gap-3">
                          {tool.image_url ? (
                            <img src={tool.image_url} alt={tool.name}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">🔧</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm leading-tight">{tool.name}</h3>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">{tool.category}</Badge>
                            </div>
                            {tool.shop_name && (
                              <div className="text-xs text-muted-foreground mt-1">Do'kon: {tool.shop_name}</div>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-primary text-sm">
                                {formatCurrency(Number(tool.price_per_day))}/kun
                              </span>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={e => { e.stopPropagation(); navigate(`/tools/${tool.id}`); }}>
                                Ijara <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full" onClick={reset}>
              Yangi qidirish
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
