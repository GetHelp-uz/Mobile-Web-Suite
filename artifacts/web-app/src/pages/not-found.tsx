import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground text-center p-4">
      <h1 className="text-9xl font-display font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Sahifa topilmadi</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Siz qidirayotgan sahifa mavjud emas yoki ko'chirilgan.
      </p>
      <Link href="/">
        <Button size="lg">Bosh sahifaga qaytish</Button>
      </Link>
    </div>
  );
}
