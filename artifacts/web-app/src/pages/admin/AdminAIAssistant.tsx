import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Send, RotateCcw, Sparkles, User, Copy,
  TrendingUp, Settings, AlertCircle, BarChart2,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  time: string;
};

const QUICK_PROMPTS = [
  { icon: TrendingUp, label: "Daromad tahlili", text: "Oxirgi oyda platform daromadi va komissiya statistikasini tahlil qilib ber" },
  { icon: AlertCircle, label: "Muammoli ijaralar", text: "Muddati o'tgan ijaralarni qanday samarali boshqarish mumkin?" },
  { icon: Settings, label: "Platform optimizatsiya", text: "GetHelp.uz platformasini yaxshilash uchun tavsiyalar ber" },
  { icon: BarChart2, label: "Foydalanuvchi statistikasi", text: "Foydalanuvchilarni segmentatsiyalash va faollikni oshirish strategiyasi" },
];

function formatTime(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function AdminAIAssistant() {
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Salom! Men GetHelp.uz platformasi uchun AI yordamchisiman. Platform boshqaruvi, statistika tahlili, foydalanuvchilar va ijaralar haqida savollaringizga javob beraman. Qanday yordam kerak?",
      time: formatTime(new Date()),
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: userText, time: formatTime(new Date()) };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const r = await fetch(`${baseUrl}/api/ai/admin-chat`, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ message: userText, history: messages.slice(-6) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "AI javob bermadi");
      setMessages(prev => [...prev, { role: "assistant", content: d.reply, time: formatTime(new Date()) }]);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Uzr, xatolik yuz berdi. Iltimos qayta urining.",
        time: formatTime(new Date()),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearChat = () => {
    setMessages([{
      role: "assistant",
      content: "Suhbat tozalandi. Yangi savol bering!",
      time: formatTime(new Date()),
    }]);
  };

  const copyMsg = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({ title: "Nusxalandi!" });
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">AI Yordamchi</h1>
              <p className="text-muted-foreground text-sm">ChatGPT asosida platform boshqaruv yordamchisi</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearChat} className="gap-1">
            <RotateCcw size={14} /> Tozalash
          </Button>
        </div>
      </div>

      {/* Tez so'rovlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {QUICK_PROMPTS.map(q => (
          <button
            key={q.label}
            onClick={() => send(q.text)}
            disabled={loading}
            className="p-3 rounded-xl border bg-card hover:bg-secondary hover:border-primary/30 transition-all text-left group"
          >
            <q.icon size={16} className="text-primary mb-1 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-medium">{q.label}</p>
          </button>
        ))}
      </div>

      {/* Chat oynasi */}
      <Card className="overflow-hidden flex flex-col" style={{ height: "calc(100vh - 360px)", minHeight: 400 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === "assistant" ? "bg-primary/10" : "bg-secondary"
              }`}>
                {msg.role === "assistant" ? (
                  <Sparkles size={16} className="text-primary" />
                ) : (
                  <User size={16} className="text-muted-foreground" />
                )}
              </div>
              <div className={`group max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-white rounded-tr-sm"
                    : "bg-secondary text-foreground rounded-tl-sm"
                }`}>
                  {msg.content}
                </div>
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-muted-foreground">{msg.time}</span>
                  {msg.role === "assistant" && (
                    <button
                      onClick={() => copyMsg(msg.content)}
                      className="ml-1 p-0.5 rounded hover:bg-secondary transition-colors"
                      title="Nusxalash"
                    >
                      <Copy size={11} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-primary animate-pulse" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-secondary">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Savolingizni yozing..."
              className="flex-1 rounded-xl"
              disabled={loading}
            />
            <Button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="rounded-xl px-4"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI yordamchi platform ma'lumotlariga asoslanadi
          </p>
        </div>
      </Card>
    </DashboardLayout>
  );
}
