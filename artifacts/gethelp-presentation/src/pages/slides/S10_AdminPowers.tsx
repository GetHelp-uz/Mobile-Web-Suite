export default function S10_AdminPowers() {
  const modules = [
    { icon: "👥", title: "Foydalanuvchilar", desc: "Ro'yxatdan o'tish tekshiruvi, bloklash, parol tiklash, 5 ta tab", color: "#7C3AED" },
    { icon: "📋", title: "Hujjatlar", desc: "Passport/ID tasdiqlash, selfie tekshiruv, rad etish + sabab", color: "#1A6FDB" },
    { icon: "💸", title: "Komissiya", desc: "6 tur (ijara/topup/yechish × mijoz/do'kon), do'kon override", color: "#FF6B1A" },
    { icon: "💳", title: "To'lov tizimlari", desc: "Click, Payme, Paynet, Uzum Bank — merchant ID, webhook URL", color: "#22C55E" },
    { icon: "📱", title: "SMS Boshqaruv", desc: "Provayder, paketlar, do'konga ulash, shablonlar, trigger", color: "#06B6D4" },
    { icon: "🤖", title: "AI Sozlamalar", desc: "GPT-4 model, tavsiya algoritmi, chatlash tili", color: "#F59E0B" },
    { icon: "🔐", title: "Xavfsizlik", desc: "Audit log, rate limit, brute-force himoya, JWT boshqaruv", color: "#EF4444" },
    { icon: "📊", title: "Server Monitor", desc: "CPU/RAM, DB holat, haftalik statistika, top do'konlar", color: "#10B981" },
    { icon: "🏪", title: "Do'kon Nazorat", desc: "Komissiya, SMS paket, to'lov tizimi, filiallar", color: "#EC4899" },
    { icon: "🎁", title: "Promo & Referal", desc: "Promo-kod yaratish, referal tizim, bonus hisoblash", color: "#8B5CF6" },
    { icon: "📦", title: "Yechib Olish", desc: "So'rovlarni ko'rib chiqish, tasdiqlash, escrow boshqaruv", color: "#F97316" },
    { icon: "🌐", title: "B2B Bozor", desc: "Korporativ mijozlar, shartnomalar, maxsus narxlar", color: "#64748B" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 60%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #7C3AED, #1A6FDB, #FF6B1A)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5vh]">
        {/* Header */}
        <div className="mb-[2.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#7C3AED" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 600 }}>Super Admin</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.3vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            12 ta kuchli boshqaruv moduli
          </h2>
        </div>

        {/* Modules grid */}
        <div className="grid grid-cols-4 gap-[1.2vw] flex-1">
          {modules.map(m => (
            <div key={m.title} className="rounded-xl p-[1.3vw] flex flex-col gap-[0.8vh]" style={{ background: "var(--c-card)", border: `1px solid ${m.color}25` }}>
              <div className="flex items-center gap-[0.7vw]">
                <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: "2.8vw", height: "2.8vw", background: `${m.color}15`, fontSize: "1.4vw" }}>
                  {m.icon}
                </div>
                <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.2vw", color: m.color, lineHeight: 1.1 }}>{m.title}</h4>
              </div>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "rgba(238,244,255,0.6)", lineHeight: 1.35 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
