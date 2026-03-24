export default function S07_CustomerJourney() {
  const steps = [
    { num: "01", icon: "🔍", title: "Qidirish", color: "#1A6FDB", desc: "Viloyat, asbob turi, narx oralig'i bo'yicha filtrlash. Xarita va ro'yxat ko'rinishi.", badge: "GPS + Xarita" },
    { num: "02", icon: "📋", title: "Tanlash", color: "#FF6B1A", desc: "Asbob rasmlari, tavsifi, do'kon reytingi. Shunga o'xshash asboblar tavsiyasi.", badge: "AI tavsiya" },
    { num: "03", icon: "💳", title: "To'lash", color: "#F59E0B", desc: "Click, Payme, Paynet, Uzum Bank yoki naqd. Hamyon balansidan to'lash.", badge: "5 usul" },
    { num: "04", icon: "📱", title: "Kuzatish", color: "#22C55E", desc: "SMS + push bildirishnoma. Ijara holati, qaytarish sanasi eslatmasi.", badge: "Real-vaqt" },
  ];

  const features = [
    { icon: "🆔", text: "Passport/ID scan tekshiruv" },
    { icon: "⭐", text: "Do'kon va asbob reytingi" },
    { icon: "❤️", text: "Sevimlilar ro'yxati" },
    { icon: "📜", text: "Ijara shartnomasi (PDF)" },
    { icon: "🔔", text: "Overdue SMS eslatma" },
    { icon: "💬", text: "Do'kon bilan chat" },
    { icon: "🎫", text: "Referal va promo-kod" },
    { icon: "🏆", text: "Sodiqlik dasturi (ball)" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 20% 80%, rgba(26,111,219,0.1) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, var(--c-primary), var(--c-accent))" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5.5vh]">
        <div className="mb-[3.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1.2vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-primary)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-primary)", fontWeight: 600 }}>Mijoz Tajribasi</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            4 qadam — asbobdan <span style={{ color: "var(--c-accent)" }}>foydalanishgacha</span>
          </h2>
        </div>

        {/* Journey steps */}
        <div className="flex gap-[1.5vw] mb-[3vh]">
          {steps.map((s) => (
            <div key={s.num} className="flex-1 rounded-2xl p-[1.8vw] relative overflow-hidden" style={{ background: "var(--c-card)", border: `1px solid ${s.color}35` }}>
              <div className="absolute top-[1.5vh] right-[1.2vw]" style={{ fontFamily: "var(--ff-display)", fontSize: "4vw", fontWeight: 900, color: `${s.color}12`, lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: "2.2vw", marginBottom: "1.2vh" }}>{s.icon}</div>
              <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.6vw", color: s.color, marginBottom: "0.8vh" }}>{s.title}</h4>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "rgba(238,244,255,0.65)", lineHeight: 1.4, marginBottom: "1.5vh" }}>{s.desc}</p>
              <div className="inline-flex items-center px-[0.8vw] py-[0.4vh] rounded-full text-xs font-semibold" style={{ background: `${s.color}18`, color: s.color, fontFamily: "var(--ff-body)", fontSize: "1vw" }}>
                {s.badge}
              </div>
            </div>
          ))}
        </div>

        {/* Extra features grid */}
        <div className="grid grid-cols-4 gap-[1.2vw]">
          {features.map(f => (
            <div key={f.text} className="flex items-center gap-[0.8vw] rounded-xl px-[1.2vw] py-[1.2vh]" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <span style={{ fontSize: "1.4vw" }}>{f.icon}</span>
              <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.15vw", color: "rgba(238,244,255,0.78)", lineHeight: 1.3 }}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
