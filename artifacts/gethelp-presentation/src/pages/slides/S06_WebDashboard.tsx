export default function S06_WebDashboard() {
  const sections = [
    { icon: "👥", label: "Foydalanuvchilar", desc: "5 tab: barchasi / do'konlar / mijozlar / ishchilar / adminlar. Qidiruv, blok/faollashtirish, parol tiklash." },
    { icon: "📋", label: "Hujjatlar", desc: "Yuklangan fayllarni ko'rib chiqish, tasdiqlash yoki rad etish. Rasm preview va eslatma." },
    { icon: "💰", label: "Komissiyalar", desc: "Har bir do'kon uchun komissiya foizi. Avtomatik chegirma va to'lov hisobi." },
    { icon: "📱", label: "SMS Shablon", desc: "Ijara, rad etish va kodlar uchun shablonlar. Emoji va o'zgaruvchilar qo'llab-quvvatlanadi." },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      {/* Side accent */}
      <div className="absolute left-0 top-[10vh] bottom-[10vh] w-[0.4vw] rounded-r-full" style={{ background: "linear-gradient(180deg, var(--c-primary), var(--c-accent))" }} />

      <div className="relative flex h-full pl-[7vw] pr-[6vw] py-[7vh] gap-[5vw]">
        {/* Left text */}
        <div className="flex flex-col justify-between" style={{ width: "42vw" }}>
          <div>
            <div className="flex items-center gap-[1vw] mb-[2vh]">
              <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-primary)", fontWeight: 600 }}>Web Dashboard</span>
            </div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.8vw", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--c-text)", marginBottom: "3vh" }}>
              Admin panel — to'liq<br />
              <span style={{ color: "var(--c-primary)" }}>nazorat</span> qo'lida
            </h2>
            <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.6vw", color: "var(--c-muted)", lineHeight: 1.5, marginBottom: "4vh" }}>
              React + Vite asosidagi web platforma. Har qanday qurilmadan brauzer orqali ishlaydi.
            </p>
          </div>

          {/* Section cards */}
          <div className="flex flex-col gap-[1.8vh]">
            {sections.map((s) => (
              <div key={s.label} className="flex items-start gap-[1.5vw] rounded-xl p-[1.5vw]" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
                <span style={{ fontSize: "2vw", flexShrink: 0 }}>{s.icon}</span>
                <div>
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.5vw", color: "var(--c-text)", marginBottom: "0.4vh" }}>{s.label}</div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.25vw", color: "var(--c-muted)", lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: mock dashboard visual */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full rounded-2xl overflow-hidden" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
            {/* Browser chrome */}
            <div className="flex items-center gap-[0.5vw] px-[1.5vw] py-[1.2vh]" style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: "1vw", height: "1vw", borderRadius: "50%", background: "#22C55E" }} />
              <div className="ml-[1vw] flex-1 rounded-md px-[1vw] py-[0.5vh]" style={{ background: "var(--c-bg)", fontSize: "1.1vw", color: "var(--c-muted)", fontFamily: "var(--ff-body)" }}>
                gethelp.uz/admin
              </div>
            </div>
            {/* Nav sidebar */}
            <div className="flex h-full">
              <div className="flex flex-col gap-[0.8vh] p-[1.2vw]" style={{ width: "12vw", background: "var(--c-surface)", borderRight: "1px solid var(--c-border)" }}>
                {["Dashboard", "Foydalanuvchilar", "Hujjatlar", "Asboblar", "Ijaralar", "Komissiyalar", "SMS Shablonlar", "AI Sozlamalar", "Statistika"].map((item, i) => (
                  <div
                    key={item}
                    className="rounded-lg px-[0.8vw] py-[0.8vh]"
                    style={{
                      background: i === 1 ? "var(--c-primary)" : "transparent",
                      fontSize: "1.1vw",
                      color: i === 1 ? "#fff" : "var(--c-muted)",
                      fontFamily: "var(--ff-body)",
                      fontWeight: i === 1 ? 600 : 400,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              {/* Main content area */}
              <div className="flex-1 p-[1.5vw] flex flex-col gap-[1.2vh]">
                <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.6vw", color: "var(--c-text)" }}>Foydalanuvchilar</div>
                <div className="flex gap-[1vw]">
                  {["Barchasi", "Do'konlar", "Mijozlar", "Ishchilar"].map((t, i) => (
                    <div key={t} className="px-[0.8vw] py-[0.5vh] rounded-lg" style={{ background: i === 0 ? "var(--c-primary)" : "var(--c-bg)", fontSize: "1vw", color: i === 0 ? "#fff" : "var(--c-muted)", fontFamily: "var(--ff-body)" }}>{t}</div>
                  ))}
                </div>
                <div className="flex flex-col gap-[0.8vh]">
                  {["Akbar Toshmatov", "Dilnoza Yusupova", "Jasur Ergashev"].map((name, i) => (
                    <div key={name} className="flex items-center gap-[1vw] px-[1vw] py-[0.8vh] rounded-lg" style={{ background: "var(--c-bg)" }}>
                      <div style={{ width: "2vw", height: "2vw", borderRadius: "50%", background: ["#1A6FDB", "#FF6B1A", "#22C55E"][i], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1vw", color: "#fff", fontFamily: "var(--ff-display)", fontWeight: 700 }}>
                        {name[0]}
                      </div>
                      <span style={{ flex: 1, fontSize: "1.1vw", color: "var(--c-text)", fontFamily: "var(--ff-body)" }}>{name}</span>
                      <span style={{ fontSize: "1vw", color: "#22C55E", fontFamily: "var(--ff-body)" }}>Faol</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
