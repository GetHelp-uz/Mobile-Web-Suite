import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Search, Phone, User, Shield, Store, Hammer,
  Eye, EyeOff, Lock, KeyRound, Power, PowerOff,
  ChevronLeft, ChevronRight, Copy, CheckCircle2, RefreshCw,
  X, UserPlus, Mail, AtSign, ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("gethelp_token") || "";
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  shop_owner: "Do'kon egasi",
  worker: "Xodim",
  customer: "Mijoz",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  shop_owner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  worker: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  customer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

interface UserItem {
  id: number;
  name: string;
  phone: string;
  username: string | null;
  email: string | null;
  role: string;
  shopId: number | null;
  isActive: boolean;
  createdAt: string;
  passportId: string | null;
  region: string | null;
}

interface ResetModalState {
  open: boolean;
  user: UserItem | null;
  newPass: string;
  showPass: boolean;
  loading: boolean;
}

interface CreateUserForm {
  name: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  role: string;
  showPass: boolean;
  loading: boolean;
}

interface RoleChangeState {
  userId: number | null;
  loading: boolean;
}

const EMPTY_CREATE: CreateUserForm = {
  name: "", phone: "", email: "", username: "", password: "",
  role: "customer", showPass: false, loading: false,
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState<ResetModalState>({
    open: false, user: null, newPass: "", showPass: false, loading: false,
  });
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE);
  const [createdUserInfo, setCreatedUserInfo] = useState<{ name: string; phone: string; generatedPassword?: string } | null>(null);
  const [roleChange, setRoleChange] = useState<RoleChangeState>({ userId: null, loading: false });
  const [openRoleDropdown, setOpenRoleDropdown] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [activeTab, debouncedSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        ...(activeTab !== "all" ? { role: activeTab } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      });
      const res = await fetch(`${BASE}/api/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ma'lumot yuklashda xatolik");
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleToggleActive(user: UserItem) {
    try {
      const res = await fetch(`${BASE}/api/users/${user.id}/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Xatolik");
      const data = await res.json();
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: data.isActive } : u));
      toast({
        title: data.isActive ? "Faollashtirildi" : "Bloklandi",
        description: `${user.name} ${data.isActive ? "faollashtirildi" : "bloklandi"}`,
      });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    }
  }

  async function handleResetPassword() {
    if (!resetModal.user) return;
    if (resetModal.newPass.length < 6) {
      toast({ title: "Xatolik", description: "Parol kamida 6 ta belgi", variant: "destructive" });
      return;
    }
    setResetModal(m => ({ ...m, loading: true }));
    try {
      const res = await fetch(`${BASE}/api/users/${resetModal.user.id}/reset-password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetModal.newPass }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Xatolik");
      toast({ title: "Parol yangilandi", description: `${resetModal.user.name} paroli o'zgartirildi` });
      setResetModal({ open: false, user: null, newPass: "", showPass: false, loading: false });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setResetModal(m => ({ ...m, loading: false }));
    }
  }

  async function handleCreateUser() {
    if (createForm.name.trim().length < 2) {
      toast({ title: "Xatolik", description: "Ism kamida 2 harf bo'lishi kerak", variant: "destructive" }); return;
    }
    if (!createForm.phone) {
      toast({ title: "Xatolik", description: "Telefon raqam kerak", variant: "destructive" }); return;
    }
    setCreateForm(f => ({ ...f, loading: true }));
    try {
      const body: Record<string, string> = {
        name: createForm.name.trim(),
        phone: createForm.phone.trim(),
        role: createForm.role,
      };
      if (createForm.email.trim()) body.email = createForm.email.trim();
      if (createForm.username.trim()) body.username = createForm.username.trim();
      if (createForm.password.trim()) body.password = createForm.password.trim();

      const res = await fetch(`${BASE}/api/users/admin-create`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setCreatedUserInfo({ name: data.name, phone: data.phone, generatedPassword: data.generatedPassword });
      setCreateForm(EMPTY_CREATE);
      fetchUsers();
      toast({ title: "Foydalanuvchi yaratildi!", description: `${data.name} muvaffaqiyatli qo'shildi` });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setCreateForm(f => ({ ...f, loading: false }));
    }
  }

  async function handleRoleChange(userId: number, newRole: string) {
    setRoleChange({ userId, loading: true });
    setOpenRoleDropdown(null);
    try {
      const res = await fetch(`${BASE}/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xatolik");
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: data.role } : u));
      toast({ title: "Rol o'zgartirildi", description: `${ROLE_LABELS[newRole]} roli berildi` });
    } catch (err: any) {
      toast({ title: "Xatolik", description: err.message, variant: "destructive" });
    } finally {
      setRoleChange({ userId: null, loading: false });
    }
  }

  function copyToClipboard(text: string, userId: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const TABS = [
    { key: "all", label: "Barcha", icon: Users },
    { key: "shop_owner", label: "Do'konlar", icon: Store },
    { key: "customer", label: "Mijozlar", icon: User },
    { key: "worker", label: "Xodimlar", icon: Hammer },
    { key: "super_admin", label: "Adminlar", icon: Shield },
  ];

  const totalPages = Math.ceil(total / 15);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6" onClick={() => openRoleDropdown !== null && setOpenRoleDropdown(null)}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Users size={24} className="text-primary" />
              Foydalanuvchilar boshqaruvi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Jami {total} ta foydalanuvchi — login, parol va rollarni boshqaring
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Yangilash
            </Button>
            <Button size="sm" onClick={() => { setCreateOpen(true); setCreatedUserInfo(null); }}>
              <UserPlus size={14} />
              Yangi foydalanuvchi
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-background shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            className="pl-9"
            placeholder="Ism, telefon yoki username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch("")}>
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Users size={40} className="mb-3 opacity-30" />
              <p>Hech narsa topilmadi</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ismi</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Login (Telefon)</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Username</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Rol</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Holat</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Ro'yhatdan o'tgan</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">#{user.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{user.name}</div>
                        {user.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
                        {user.passportId && (
                          <div className="text-xs text-muted-foreground">Pasport: {user.passportId}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone size={12} className="text-muted-foreground flex-shrink-0" />
                          <span className="font-mono text-xs">{user.phone}</span>
                          <button
                            onClick={() => copyToClipboard(user.phone, user.id)}
                            className="text-muted-foreground hover:text-primary"
                            title="Nusxa olish"
                          >
                            {copiedId === user.id
                              ? <CheckCircle2 size={12} className="text-green-500" />
                              : <Copy size={12} />
                            }
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.username ? (
                          <div className="flex items-center gap-1">
                            <User size={12} className="text-muted-foreground" />
                            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{user.username}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 relative">
                        <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenRoleDropdown(openRoleDropdown === user.id ? null : user.id)}
                            disabled={roleChange.loading && roleChange.userId === user.id}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${ROLE_COLORS[user.role] || ""}`}
                          >
                            {ROLE_LABELS[user.role] || user.role}
                            <ChevronDown size={10} />
                          </button>
                          {openRoleDropdown === user.id && (
                            <div className="absolute top-full left-0 mt-1 w-36 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                              {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => (
                                <button
                                  key={roleKey}
                                  onClick={() => handleRoleChange(user.id, roleKey)}
                                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${user.role === roleKey ? "font-semibold" : ""}`}
                                >
                                  {roleLabel}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${user.isActive ? "text-green-600" : "text-red-500"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                          {user.isActive ? "Faol" : "Bloklangan"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString("uz-UZ") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setResetModal({ open: true, user, newPass: "", showPass: false, loading: false })}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Parolni tiklash"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-1.5 rounded hover:bg-muted transition-colors ${user.isActive ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`}
                            title={user.isActive ? "Bloklash" : "Faollashtirish"}
                          >
                            {user.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * 15 + 1}–{Math.min(page * 15, total)} / {total}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="flex items-center px-3 text-sm font-medium">{page} / {totalPages}</span>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Create User Modal ─────────────────────────────────────────────────── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <UserPlus size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Yangi foydalanuvchi</h3>
                  <p className="text-muted-foreground text-sm">Admin tomonidan yaratish</p>
                </div>
              </div>
              <button onClick={() => { setCreateOpen(false); setCreatedUserInfo(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            {createdUserInfo ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle2 size={18} />
                    Foydalanuvchi muvaffaqiyatli yaratildi!
                  </div>
                  <div className="text-sm space-y-1 mt-2">
                    <div><span className="text-muted-foreground">Ism:</span> <strong>{createdUserInfo.name}</strong></div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Telefon:</span>
                      <strong className="font-mono">{createdUserInfo.phone}</strong>
                      <button onClick={() => copyToClipboard(createdUserInfo.phone, -1)} className="text-muted-foreground hover:text-primary">
                        <Copy size={12} />
                      </button>
                    </div>
                    {createdUserInfo.generatedPassword && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Parol:</span>
                        <strong className="font-mono bg-muted px-2 py-0.5 rounded">{createdUserInfo.generatedPassword}</strong>
                        <button onClick={() => copyToClipboard(createdUserInfo.generatedPassword!, -2)} className="text-muted-foreground hover:text-primary">
                          <Copy size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Bu parolni foydalanuvchiga xavfsiz usulda yuboring!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setCreatedUserInfo(null); }}>
                    Yana qo'shish
                  </Button>
                  <Button className="flex-1" onClick={() => { setCreateOpen(false); setCreatedUserInfo(null); }}>
                    Yopish
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold block mb-1.5">To'liq ism *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <Input
                      className="pl-9"
                      placeholder="Ism Familiya"
                      value={createForm.name}
                      onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5">Telefon raqam *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <Input
                      className="pl-9 font-mono"
                      placeholder="998901234567"
                      value={createForm.phone}
                      onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5">Username (ixtiyoriy)</label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <Input
                      className="pl-9"
                      placeholder="username"
                      value={createForm.username}
                      onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5">Email (ixtiyoriy)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <Input
                      className="pl-9"
                      placeholder="email@example.com"
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5">Rol *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(ROLE_LABELS).map(([roleKey, roleLabel]) => (
                      <button
                        key={roleKey}
                        onClick={() => setCreateForm(f => ({ ...f, role: roleKey }))}
                        className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          createForm.role === roleKey
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {roleLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold block mb-1.5">Parol (ixtiyoriy)</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                    <Input
                      type={createForm.showPass ? "text" : "password"}
                      className="pl-9 pr-9"
                      placeholder="Kiritilmasa avtomatik yaratiladi"
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setCreateForm(f => ({ ...f, showPass: !f.showPass }))}
                    >
                      {createForm.showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Bo'sh qoldirsangiz "gethelp123" parol avtomatik beriladi
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>
                    Bekor qilish
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateUser}
                    disabled={createForm.loading}
                  >
                    {createForm.loading ? "Yaratilmoqda..." : "Foydalanuvchi yaratish"}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Reset Password Modal ──────────────────────────────────────────────── */}
      {resetModal.open && resetModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <KeyRound size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Parolni tiklash</h3>
                  <p className="text-muted-foreground text-sm">{resetModal.user.name}</p>
                </div>
              </div>
              <button onClick={() => setResetModal(m => ({ ...m, open: false }))} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-muted-foreground" />
                  <span className="font-mono">{resetModal.user.phone}</span>
                </div>
                {resetModal.user.username && (
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-muted-foreground" />
                    <span className="font-mono">{resetModal.user.username}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-muted-foreground" />
                  <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[resetModal.user.role]}`}>
                    {ROLE_LABELS[resetModal.user.role]}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold block mb-2">Yangi parol</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                  <Input
                    type={resetModal.showPass ? "text" : "password"}
                    placeholder="Kamida 6 ta belgi"
                    className="pl-9 pr-9"
                    value={resetModal.newPass}
                    onChange={e => setResetModal(m => ({ ...m, newPass: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setResetModal(m => ({ ...m, showPass: !m.showPass }))}
                  >
                    {resetModal.showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Foydalanuvchiga yangi parolni SMS yoki shaxsan xabar bering.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setResetModal(m => ({ ...m, open: false }))}>
                Bekor qilish
              </Button>
              <Button className="flex-1" onClick={handleResetPassword} disabled={resetModal.loading || resetModal.newPass.length < 6}>
                {resetModal.loading ? "Saqlanmoqda..." : "Parolni Yangilash"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
