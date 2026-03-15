import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListShops, useListUsers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, ArrowUpRight } from "lucide-react";

export default function AdminOverview() {
  const { data: shops } = useListShops({});
  const { data: users } = useListUsers({});

  return (
    <DashboardLayout>
      <h1 className="text-4xl font-display font-bold mb-8">Super Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <Card className="bg-primary text-primary-foreground border-none">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/70 font-medium mb-2">Total Partner Shops</p>
              <h2 className="text-5xl font-bold">{shops?.total || 0}</h2>
            </div>
            <Building2 size={64} className="opacity-20" />
          </CardContent>
        </Card>
        
        <Card className="bg-secondary border-none">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <p className="text-muted-foreground font-medium mb-2">Total Registered Users</p>
              <h2 className="text-5xl font-bold text-primary">{users?.total || 0}</h2>
            </div>
            <Users size={64} className="opacity-10 text-primary" />
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-6">Recent Shops</h2>
      <div className="space-y-4">
        {shops?.shops?.slice(0, 5).map(shop => (
          <Card key={shop.id}>
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{shop.name}</h3>
                <p className="text-sm text-muted-foreground">{shop.address}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-sm font-bold text-accent bg-accent/10 px-3 py-1 rounded-full">
                  {shop.commission}% Commission
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
