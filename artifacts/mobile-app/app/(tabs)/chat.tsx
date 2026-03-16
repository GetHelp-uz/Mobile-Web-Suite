import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView
} from "react-native";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Ionicons, Feather } from "@expo/vector-icons";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  return domain ? `https://${domain}/api` : "";
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Hozir";
  if (diff < 3600) return `${Math.floor(diff / 60)} daq`;
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["#f97316", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899"];
  const color = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

export default function ChatTab() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const baseUrl = getBaseUrl();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastMsgId, setLastMsgId] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const r = await fetch(`${baseUrl}/chat/rooms`, { headers: h });
      const d = await r.json();
      setRooms(d.rooms || []);
    } finally { setLoadingRooms(false); }
  }, [token]);

  const loadMessages = useCallback(async (roomId: number) => {
    const r = await fetch(`${baseUrl}/chat/rooms/${roomId}/messages?limit=50`, { headers: h });
    const d = await r.json();
    const msgs = d.messages || [];
    setMessages(msgs);
    if (msgs.length) setLastMsgId(msgs[msgs.length - 1].id);
    fetch(`${baseUrl}/chat/rooms/${roomId}/read`, { method: "PATCH", headers: h });
    loadRooms();
  }, [token]);

  useEffect(() => { loadRooms(); }, []);

  useEffect(() => {
    if (!selectedRoom) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      if (!lastMsgId) return;
      try {
        const r = await fetch(`${baseUrl}/chat/rooms/${selectedRoom.id}/messages/new?after=${lastMsgId}`, { headers: h });
        const d = await r.json();
        if (d.messages?.length) {
          setMessages(prev => [...prev, ...d.messages]);
          setLastMsgId(d.messages[d.messages.length - 1].id);
          loadRooms();
        }
      } catch {}
    }, 2500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedRoom, lastMsgId, token]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedRoom || sending) return;
    setSending(true);
    try {
      const r = await fetch(`${baseUrl}/chat/rooms/${selectedRoom.id}/messages`, {
        method: "POST", headers: h,
        body: JSON.stringify({ message: message.trim() }),
      });
      const d = await r.json();
      if (r.ok) {
        setMessages(prev => [...prev, d.message]);
        setLastMsgId(d.message.id);
        setMessage("");
        loadRooms();
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } finally { setSending(false); }
  };

  if (selectedRoom) {
    const otherName = user?.role === "customer" ? selectedRoom.shop_name : selectedRoom.customer_name;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <TouchableOpacity onPress={() => setSelectedRoom(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={C.text} />
          </TouchableOpacity>
          <Avatar name={otherName} size={36} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.chatHeaderName, { color: C.text }]} numberOfLines={1}>{otherName}</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: msg }) => {
            const isMine = msg.sender_id === user?.userId;
            return (
              <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowOther]}>
                {!isMine && <Avatar name={msg.sender_name} size={28} />}
                <View style={{ maxWidth: "75%", marginLeft: isMine ? 0 : 8 }}>
                  <View style={[
                    styles.bubble,
                    isMine ? { backgroundColor: "#f97316", borderBottomRightRadius: 4 } : { backgroundColor: C.surface, borderBottomLeftRadius: 4 }
                  ]}>
                    <Text style={[styles.msgText, { color: isMine ? "#fff" : C.text }]}>{msg.message}</Text>
                  </View>
                  <Text style={[styles.msgTime, isMine ? { textAlign: "right" } : {}]}>{formatTime(msg.created_at)}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCenter}>
              <Ionicons name="chatbubbles-outline" size={48} color={C.textSecondary} />
              <Text style={[styles.emptyText, { color: C.textSecondary }]}>Hali xabar yo'q</Text>
            </View>
          }
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.inputRow, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <TextInput
              style={[styles.msgInput, { backgroundColor: C.background, color: C.text }]}
              placeholder="Xabar yozing..."
              placeholderTextColor={C.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!message.trim() || sending) && { opacity: 0.5 }]}
              onPress={sendMessage}
              disabled={!message.trim() || sending}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>Xabarlar</Text>
      </View>

      {loadingRooms ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#f97316" />
      ) : rooms.length === 0 ? (
        <View style={styles.emptyCenter}>
          <Ionicons name="chatbubbles-outline" size={64} color={C.textSecondary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Xabarlar yo'q</Text>
          <Text style={[styles.emptyText, { color: C.textSecondary }]}>Do'kon bilan suhbat boshlash uchun{"\n"}asbob sahifasiga o'ting</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: room }) => {
            const otherName = user?.role === "customer" ? room.shop_name : room.customer_name;
            const unread = user?.role === "customer" ? room.customer_unread : room.shop_unread;
            return (
              <TouchableOpacity
                style={[styles.roomItem, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => { setSelectedRoom(room); loadMessages(room.id); }}>
                <Avatar name={otherName} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.roomTopRow}>
                    <Text style={[styles.roomName, { color: C.text }]} numberOfLines={1}>{otherName}</Text>
                    {unread > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{unread}</Text>
                      </View>
                    )}
                  </View>
                  {room.last_message && (
                    <Text style={[styles.lastMsg, { color: C.textSecondary }]} numberOfLines={1}>{room.last_message}</Text>
                  )}
                  {room.last_message_at && (
                    <Text style={[styles.roomTime, { color: C.textSecondary }]}>{formatTime(room.last_message_at)}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 8, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  roomItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1 },
  roomTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomName: { fontSize: 15, fontWeight: "600", flex: 1 },
  lastMsg: { fontSize: 13, marginTop: 2 },
  roomTime: { fontSize: 11, marginTop: 2 },
  badge: { backgroundColor: "#f97316", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700" },
  chatHeader: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  backBtn: { marginRight: 8, padding: 4 },
  chatHeaderName: { fontSize: 16, fontWeight: "600" },
  msgRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 4 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowOther: { justifyContent: "flex-start" },
  bubble: { padding: 10, borderRadius: 16, maxWidth: "100%" },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTime: { fontSize: 10, color: "#94a3b8", marginTop: 3 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 8, borderTopWidth: 1, gap: 8 },
  msgInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  emptyText: { fontSize: 14, textAlign: "center", marginTop: 6, lineHeight: 20 },
});
