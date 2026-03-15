import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useListTools } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Tag } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";

const statusLabels: Record<string, string> = {
  available: "Mavjud",
  rented: "Ijarada",
  maintenance: "Ta'mirda",
};

export default function BrowseTools() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useListTools({});

  const tools = data?.tools || [];
  const filteredTools = tools.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-display font-bold mb-4">Mavjud asboblar</h1>
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input 
            placeholder="Qidiruv: burg'u, generator, lesa..." 
            className="pl-12 h-14 text-lg rounded-2xl shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="h-96 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map(tool => (
            <Card key={tool.id} className="group overflow-hidden flex flex-col">
              <div className="h-48 bg-secondary relative p-4 flex items-center justify-center">
                <img 
                  src={tool.imageUrl || `${import.meta.env.BASE_URL}images/placeholder-tool.png`} 
                  alt={tool.name}
                  className="max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4">
                  <Badge variant={tool.status === 'available' ? 'success' : tool.status === 'rented' ? 'warning' : 'destructive'}>
                    {statusLabels[tool.status] ?? tool.status}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-sm text-accent font-semibold mb-2">
                  <Tag size={14} />
                  {tool.category}
                </div>
                <h3 className="text-xl font-bold mb-2 line-clamp-1">{tool.name}</h3>
                <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
                  <MapPin size={14} />
                  {tool.shopName || "Hamkor do'kon"}
                </div>
                
                <div className="mt-auto pt-4 border-t border-border flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Kunlik narx</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(tool.pricePerDay)}</p>
                  </div>
                  <Link href={`/tools/${tool.id}`}>
                    <Button variant={tool.status === 'available' ? 'default' : 'secondary'} disabled={tool.status !== 'available'}>
                      {tool.status === 'available' ? 'Ijara olish' : 'Mavjud emas'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
