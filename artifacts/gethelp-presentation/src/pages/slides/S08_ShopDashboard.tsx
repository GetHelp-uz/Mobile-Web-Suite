export default function S08_ShopDashboard() {
  const tools = [
    { icon: "🛠️", label: "Asbob qo'shish", desc: "Rasm, narx, kategoriya, depozit, holat belgilash" },
    { icon: "📋", label: "Ijara boshqaruvi", desc: "QR skan, tasdiqlash, rad etish, uzaytirish" },
    { icon: "👷", label: "Ishchilar", desc: "Ishchi tayinlash, ish vaqti, KPI va baho" },
    { icon: "💰", label: "Daromad & Hamyon", desc: "To'lovlar, komissiya, yechib olish so'rovi" },
    { icon: "📊", label: "Analitika", desc: "Kunlik/oylik daromad grafiklari" },
    { icon: "🔔", label: "SMS Xabarnomalar", desc: "Paket tanlash, avtomatik SMS yuborish" },
  ];

  const stats = [
    { label: "Jami asboblar", val: "48", color: "#1A6FDB" },
    { label: "Faol ijaralar", val: "12", color: "#FF6B1A" },
    { label: "Oylik daromad", val: "8.4M", color: "#22C55E" },
    { label: "Reyting", val: "4.8★", color: "#F59E0B" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 80% 20%, rgba(255,107,26,0.09) 0%, transparent 55%)" }} />
      <div className="absolute right-0 top-0 bottom-0 w-[0.5vw]" style={{ background: "linear-gradient(180deg, var(--c-accent), var(--c-gold))" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5.5vh]">
        {/* Header */}
        <div className="mb-[3vh]">
          <div className="flex items-center gap-[1vw] mb-[1.2vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-accent)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-accent)", fontWeight: 600 }}>Do'kon Egasi</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1.05 }}>
            Do'koni to'liq <span style={{ color: "var(--c-accent)" }}>qo'lida</span>
          </h2>
        </div>

        <div className="flex gap-[3vw] flex-1">
          {/* Left: features */}
          <div className="flex-1 grid grid-cols-2 gap-[1.5vw]">
            {tools.map(t => (
              <div key={t.label} className="flex items-start gap-[1vw] rounded-xl p-[1.4vw]" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
                <span style={{ fontSize: "1.8vw", flexShrink: 0 }}>{t.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.35vw", color: "var(--c-text)", marginBottom: "0.4vh" }}>{t.label}</div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "var(--c-muted)", lineHeight: 1.35 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Right: mock dashboard */}
          <div style={{ width: "34vw" }}>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-[1vw] mb-[1.5vw]">
              {stats.map(s => (
                <div key={s.label} className="rounded-xl p-[1.4vw]" style={{ background: "var(--c-card)", border: `1px solid ${s.color}30` }}>
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "2.4vw", color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "var(--c-muted)", marginTop: "0.4vh" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Recent rentals mock */}
            <div className="rounded-xl p-[1.4vw]" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.3vw", color: "var(--c-text)", marginBottom: "1.2vh" }}>Oxirgi ijaralar</div>
              {[
                { name: "Perforator Bosch", user: "Akbar T.", status: "active", color: "#22C55E" },
                { name: "Burg'ulash mashina", user: "Dilnoza Y.", status: "pending", color: "#F59E0B" },
                { name: "Betonomeshalka", user: "Jasur E.", status: "returned", color: "#7B93B8" },
              ].map((r) => (
                <div key={r.name} className="flex items-center justify-between py-[0.7vh] border-b" style={{ borderColor: "var(--c-border)" }}>
                  <div>
                    <div style={{ fontFamily: "var(--ff-body)", fontWeight: 600, fontSize: "1.15vw", color: "var(--c-text)" }}>{r.name}</div>
                    <div style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "var(--c-muted)" }}>{r.user}</div>
                  </div>
                  <div className="px-[0.7vw] py-[0.3vh] rounded-full text-xs font-semibold" style={{ background: `${r.color}18`, color: r.color, fontFamily: "var(--ff-body)", fontSize: "0.95vw" }}>
                    {r.status === "active" ? "Faol" : r.status === "pending" ? "Kutilmoqda" : "Qaytarildi"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
