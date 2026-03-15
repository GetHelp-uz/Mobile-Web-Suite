import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useGetDashboardAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, Hammer, AlertTriangle, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function ShopDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useGetDashboardAnalytics({ shopId: user?.shopId });

  if (isLoading) return <DashboardLayout>Loading...</DashboardLayout>;
  if (!stats) return <DashboardLayout>No data available</DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-4xl font-display font-bold mb-8">Shop Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-primary text-primary-foreground border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-primary-foreground/70 font-medium mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</h3>
              </div>
              <div className="p-3 bg-white/10 rounded-xl">
                <DollarSign className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Active Rentals</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.activeRentals}</h3>
              </div>
              <div className="p-3 bg-secondary rounded-xl">
                <Hammer className="text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Overdue Returns</p>
                <h3 className="text-3xl font-bold text-destructive">{stats.overdueRentals}</h3>
              </div>
              <div className="p-3 bg-destructive/10 rounded-xl">
                <AlertTriangle className="text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Total Tools</p>
                <h3 className="text-3xl font-bold text-foreground">{stats.totalTools}</h3>
                <p className="text-xs text-muted-foreground mt-1">{stats.availableTools} available</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-xl">
                <Users className="text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Revenue Overview (30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByPeriod}>
                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value / 1000}k`}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
