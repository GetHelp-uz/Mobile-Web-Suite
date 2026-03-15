import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListRentals } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Clock, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

const statusLabels: Record<string, string> = {
  active: "Faol",
  overdue: "Muddati o'tgan",
  returned: "Qaytarilgan",
  pending: "Kutilmoqda",
};

export default function MyRentals() {
  const { user } = useAuth();
  const { data, isLoading } = useListRentals({ customerId: user?.id });

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

                <div className="flex items-center gap-8 md:text-right">
                  <div>
                    <p className="text-sm text-muted-foreground">To'langan summa</p>
                    <p className="font-bold">{formatCurrency(rental.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Depozit</p>
                    <p className="font-bold text-accent">{formatCurrency(rental.depositAmount)}</p>
                  </div>
                  {rental.status === 'returned' && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
                      <CheckCircle size={18} />
                      <span className="font-bold text-sm">Qaytarildi</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
