export default function S13_MobileApp() {
  const screens = [
    { title: "Bosh sahifa", desc: "Yaqin asboblar, tavsiyalar", icon: "🏠", color: "#1A6FDB" },
    { title: "Qidiruv", desc: "Filter, xarita, narx", icon: "🔍", color: "#FF6B1A" },
    { title: "Hamyon", desc: "Balans, topup, tarix", icon: "💳", color: "#22C55E" },
    { title: "Profilim", desc: "Hujjatlar, ijara tarixi", icon: "👤", color: "#7C3AED" },
  ];

  const techFeatures = [
    { icon: "📱", text: "iOS va Android (bitta kod baza)" },
    { icon: "📷", text: "Kamera — hujjat skanerlash" },
    { icon: "📍", text: "GPS joylashuv — yaqin do'konlar" },
    { icon: "🔔", text: "Push notification" },
    { icon: "🌐", text: "Offline rejim (basic)" },
    { icon: "🤙", text: "Biometrik kirish" },
    { icon: "📲", text: "Deep link qo'llab-quvvatlash" },
    { icon: "🌙", text: "Qoʻrqinchsiz Dark mode" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 70% 30%, rgba(26,111,219,0.1) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #1A6FDB, #7C3AED)" }} />

      <div className="relative flex h-full px-[6vw] py-[5.5vh] gap-[3vw]">
        {/* Left text */}
        <div className="flex flex-col justify-between" style={{ width: "42vw" }}>
          <div>
            <div className="flex items-center gap-[1vw] mb-[1.5vh]">
              <div style={{ width: "3vw", height: "0.4vh", background: "#1A6FDB" }} />
              <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1A6FDB", fontWeight: 600 }}>Mobil Ilova</span>
            </div>
            <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1.05, marginBottom: "2.5vh" }}>
              React Native <span style={{ color: "#1A6FDB" }}>Expo</span> — iOS va Android
            </h2>

            {/* Screen cards */}
            <div className="grid grid-cols-2 gap-[1.2vw] mb-[2.5vh]">
              {screens.map(s => (
                <div key={s.title} className="flex items-center gap-[0.8vw] rounded-xl p-[1.2vw]" style={{ background: "var(--c-card)", border: `1px solid ${s.color}30` }}>
                  <div className="rounded-xl flex items-center justify-center flex-shrink-0" style={{ width: "3vw", height: "3vw", background: `${s.color}15`, fontSize: "1.5vw" }}>{s.icon}</div>
                  <div>
                    <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.2vw", color: s.color }}>{s.title}</div>
                    <div style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "var(--c-muted)" }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tech features */}
            <div className="grid grid-cols-2 gap-[0.8vw]">
              {techFeatures.map(f => (
                <div key={f.text} className="flex items-center gap-[0.7vw]">
                  <span style={{ fontSize: "1.2vw", flexShrink: 0 }}>{f.icon}</span>
                  <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "rgba(238,244,255,0.72)" }}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Phone mockups */}
        <div className="flex-1 flex items-center justify-center gap-[2vw]">
          {[
            { bg: "#1A6FDB", items: ["🏠 Yaqin asboblar", "⭐ Tavsiyalar", "🔔 Bildirishnomalar"] },
            { bg: "#FF6B1A", items: ["🔍 Asbob qidirish", "📍 Xaritada ko'rish", "💰 Narxlarni solishtirish"] },
          ].map((phone, pi) => (
            <div key={pi} className="flex flex-col items-center" style={{ transform: pi === 1 ? "translateY(3vh)" : "none" }}>
              <div className="rounded-[3vw] overflow-hidden" style={{ width: "16vw", height: "32vw", background: "var(--c-card)", border: `2px solid ${phone.bg}40`, boxShadow: `0 2vw 6vw ${phone.bg}20` }}>
                {/* Status bar */}
                <div className="flex items-center justify-between px-[1.5vw] py-[1vh]" style={{ background: phone.bg }}>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "rgba(255,255,255,0.9)" }}>9:41</div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "rgba(255,255,255,0.9)" }}>📶 🔋</div>
                </div>
                {/* Content */}
                <div className="p-[1.5vw] flex flex-col gap-[1.2vh]">
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.3vw", color: "var(--c-text)" }}>GetHelp.uz</div>
                  {phone.items.map(item => (
                    <div key={item} className="rounded-xl px-[1vw] py-[1vh]" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                      <span style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "rgba(238,244,255,0.75)" }}>{item}</span>
                    </div>
                  ))}
                  <div className="flex-1 rounded-xl mt-[1vh]" style={{ background: `${phone.bg}10`, minHeight: "8vw", border: `1px dashed ${phone.bg}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: "3vw", opacity: 0.5 }}>📱</span>
                  </div>
                </div>
                {/* Bottom nav */}
                <div className="flex items-center justify-around py-[1.2vh] px-[1vw]" style={{ background: "var(--c-surface)", borderTop: "1px solid var(--c-border)" }}>
                  {["🏠", "🔍", "💳", "👤"].map((ico, i) => (
                    <div key={ico} style={{ fontSize: "1.4vw", opacity: i === 0 ? 1 : 0.4 }}>{ico}</div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
