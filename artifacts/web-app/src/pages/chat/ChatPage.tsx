import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { MessageSquare, Send, Search, Clock } from "lucide-react";

function formatTime(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Hozir";
  if (diff < 3600) return `${Math.floor(diff / 60)} daq oldin`;
  if (diff < 86400) return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("uz-UZ");
}

function Avatar({ name, image }: { name?: string; image?: string }) {
  if (image) return <img src={image} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt={name} />;
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-orange-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const token = localStorage.getItem("gethelp_token") || "";
  const baseUrl = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [lastMsgId, setLastMsgId] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRooms = useCallback(async () => {
    const r = await fetch(`${baseUrl}/api/chat/rooms`, { headers: h });
    const d = await r.json();
    setRooms(d.rooms || []);
  }, []);

  const loadMessages = useCallback(async (roomId: number) => {
    const r = await fetch(`${baseUrl}/api/chat/rooms/${roomId}/messages?limit=60`, { headers: h });
    const d = await r.json();
    const msgs = d.messages || [];
    setMessages(msgs);
    if (msgs.length) setLastMsgId(msgs[msgs.length - 1].id);
    // O'qildi deb belgilash
    fetch(`${baseUrl}/api/chat/rooms/${roomId}/read`, { method: "PATCH", headers: h });
    loadRooms();
  }, []);

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Yangi xabarlarni polling
  useEffect(() => {
    if (!selectedRoom) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!lastMsgId) return;
      const r = await fetch(`${baseUrl}/api/chat/rooms/${selectedRoom.id}/messages/new?after=${lastMsgId}`, { headers: h });
      const d = await r.json();
      if (d.messages?.length) {
        setMessages(prev => [...prev, ...d.messages]);
        setLastMsgId(d.messages[d.messages.length - 1].id);
        loadRooms();
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRoom, lastMsgId]);

  const selectRoom = (room: any) => {
    setSelectedRoom(room);
    loadMessages(room.id);
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedRoom || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${baseUrl}/api/chat/rooms/${selectedRoom.id}/messages`, {
        method: "POST", headers: h,
        body: JSON.stringify({ message: message.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessages(prev => [...prev, d.message]);
      setLastMsgId(d.message.id);
      setMessage("");
      loadRooms();
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const filteredRooms = rooms.filter(r => {
    const name = r.customer_name || r.shop_name || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const myRole = user?.role;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-120px)] flex gap-4">
        {/* Xonalar paneli */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          <div className="mb-3">
            <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
              <MessageSquare className="h-5 w-5 text-primary" /> Xabarlar
            </h1>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {filteredRooms.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Xabarlar yo'q</p>
              </div>
            )}
            {filteredRooms.map(room => {
              const otherName = myRole === "customer" ? room.shop_name : room.customer_name;
              const unread = myRole === "customer" ? room.customer_unread : room.shop_unread;
              return (
                <button key={room.id}
                  className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 ${selectedRoom?.id === room.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"}`}
                  onClick={() => selectRoom(room)}>
                  <Avatar name={otherName} image={room.shop_image} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm truncate">{otherName}</span>
                      {unread > 0 && (
                        <Badge className="bg-primary text-white text-xs min-w-[20px] h-5 flex items-center justify-center">{unread}</Badge>
                      )}
                    </div>
                    {room.last_message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{room.last_message}</p>
                    )}
                    {room.last_message_at && (
                      <p className="text-xs text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(room.last_message_at)}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col border border-border rounded-2xl overflow-hidden">
          {!selectedRoom ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Suhbat tanlang</p>
              <p className="text-sm mt-1">Chap tarafdagi ro'yxatdan suhbat oching</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border flex items-center gap-3 bg-muted/30">
                <Avatar
                  name={myRole === "customer" ? selectedRoom.shop_name : selectedRoom.customer_name}
                  image={selectedRoom.shop_image}
                />
                <div>
                  <div className="font-bold">
                    {myRole === "customer" ? selectedRoom.shop_name : selectedRoom.customer_name}
                  </div>
                  {myRole !== "customer" && selectedRoom.customer_phone && (
                    <div className="text-xs text-muted-foreground">{selectedRoom.customer_phone}</div>
                  )}
                </div>
              </div>

              {/* Xabarlar */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">Hali xabar yo'q. Birinchi bo'lib yozing!</p>
                  </div>
                )}
                {messages.map(msg => {
                  const isMine = msg.sender_id === user?.userId;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <Avatar name={msg.sender_name} />
                      )}
                      <div className={`max-w-[70%] ${isMine ? "order-first" : "ml-2"}`}>
                        {!isMine && (
                          <div className="text-xs text-muted-foreground mb-1 ml-1">{msg.sender_name}</div>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl text-sm break-words ${
                          isMine
                            ? "bg-primary text-white rounded-tr-sm ml-auto"
                            : "bg-muted rounded-tl-sm"
                        }`}>
                          {msg.message}
                        </div>
                        <div className={`text-xs text-muted-foreground mt-1 ${isMine ? "text-right" : "text-left ml-1"}`}>
                          {formatTime(msg.created_at)}
                          {isMine && msg.is_read && <span className="ml-1 text-primary">✓✓</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Xabar yuborish */}
              <div className="p-3 border-t border-border flex gap-2">
                <Input
                  placeholder="Xabar yozing..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={sending || !message.trim()} size="icon" className="rounded-xl">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
