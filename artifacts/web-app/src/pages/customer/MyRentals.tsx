import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListRentals } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Clock, CheckCircle, Star } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const statusLabels: Record<string, string> = {
  active: "Faol",
  overdue: "Muddati o'tgan",
  returned: "Qaytarilgan",
  pending: "Kutilmoqda",
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button"
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(i)}
          className="transition-transform hover:scale-110">
          <Star size={32} className={(hovered || value) >= i ? "text-yellow-400 fill-yellow-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

export default function MyRentals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useListRentals({ customerId: user?.id });
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [ratingDialog, setRatingDialog] = useState<any>(null);
  const [ratingVal, setRatingVal] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ratedIds, setRatedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem("rated_rentals");
    if (saved) setRatedIds(new Set(JSON.parse(saved)));
  }, []);

  const submitRating = async () => {
    if (!ratingDialog) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${baseUrl}/api/ratings`, {
        method: "POST", headers: h,
        body: JSON.stringify({
          toolId: ratingDialog.toolId,
          shopId: ratingDialog.shopId,
          rentalId: ratingDialog.id,
          rating: ratingVal,
          comment: comment.trim() || null,
        }),
      });
      if (r.ok) {
        const newRated = new Set([...ratedIds, ratingDialog.id]);
        setRatedIds(newRated);
        localStorage.setItem("rated_rentals", JSON.stringify([...newRated]));
        toast({ title: "Rahmat!", description: "Bahoyingiz qabul qilindi!" });
        setRatingDialog(null);
        setRatingVal(5);
        setComment("");
      } else {
        toast({ title: "Xatolik", variant: "destructive" });
      }
    } finally { setSubmitting(false); }
  };

  const rentals = data?.rentals || [];

  return (
    <DashboardLayout>
      <h1 className="text-4xl font-display font-bold mb-8">Mening ijaralarim</h1>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted" />)}
        </div>
      ) : rentals.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Faol ijara yo'q</h3>
          <p className="text-muted-foreground">Ijara olganingizda ular shu yerda ko'rinadi.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {rentals.map(rental => (
            <Card key={rental.id} className="overflow-hidden">
              <div className={`h-2 w-full ${rental.status === 'active' ? 'bg-primary' : rental.status === 'overdue' ? 'bg-destructive' : 'bg-green-500'}`} />
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{rental.toolName}</h3>
                    <Badge variant={rental.status === 'active' ? 'default' : rental.status === 'overdue' ? 'destructive' : 'success'}>
                      {statusLabels[rental.status] ?? rental.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-4">
                    <span>Boshlandi: {format(new Date(rental.startedAt), 'dd.MM.yyyy')}</span>
                    <span>Muddat: {format(new Date(rental.dueDate!), 'dd.MM.yyyy')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:text-right flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">To'langan summa</p>
                    <p className="font-bold">{formatCurrency(rental.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Depozit</p>
                    <p className="font-bold text-accent">{formatCurrency(rental.depositAmount)}</p>
                  </div>
                  {rental.status === 'returned' && !ratedIds.has(rental.id) && (
                    <Button size="sm" variant="outline" className="gap-1.5 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                      onClick={() => { setRatingDialog(rental); setRatingVal(5); setComment(""); }}>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      Baho berish
                    </Button>
                  )}
                  {rental.status === 'returned' && ratedIds.has(rental.id) && (
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle size={18} />
                      <span className="font-bold text-sm">Baholandi</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Baho berish dialogi */}
      <Dialog open={!!ratingDialog} onOpenChange={open => !open && setRatingDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asbobni baholang</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-muted-foreground text-sm">{ratingDialog?.toolName} — ijarangiz uchun baho bering</p>
            <div className="flex flex-col items-center gap-3 py-2">
              <StarPicker value={ratingVal} onChange={setRatingVal} />
              <p className="text-sm font-medium">
                {ratingVal === 1 ? "Juda yomon" : ratingVal === 2 ? "Yomon" : ratingVal === 3 ? "O'rtacha" : ratingVal === 4 ? "Yaxshi" : "A'lo!"}
              </p>
            </div>
            <Textarea
              placeholder="Izoh qoldiring (ixtiyoriy)..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRatingDialog(null)}>Bekor</Button>
            <Button onClick={submitRating} disabled={submitting}>
              {submitting ? "Yuborilmoqda..." : "Yuborish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
