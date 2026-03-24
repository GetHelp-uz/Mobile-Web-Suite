export default function S16_BusinessModel() {
  const streams = [
    {
      icon: "💸",
      title: "Ijara Komissiyasi",
      desc: "Har bir muvaffaqiyatli ijaradan platforma ulushi",
      example: "10% × 8,000 UZS/kun = 800 UZS/ijara",
      potential: "300M+ UZS/oy",
      color: "#1A6FDB",
    },
    {
      icon: "📦",
      title: "Obuna Rejalari",
      desc: "Do'konlar uchun oylik obuna: Starter, Pro, Enterprise",
      example: "299,000 UZS/oy × 100 do'kon",
      potential: "30M+ UZS/oy",
      color: "#FF6B1A",
    },
    {
      icon: "📱",
      title: "SMS Paket",
      desc: "SMS paket sotish — Eskiz, PlayMobile orqali",
      example: "500 SMS × 120 UZS + margin",
      potential: "15M+ UZS/oy",
      color: "#22C55E",
    },
    {
      icon: "💳",
      title: "Yechish Komissiyasi",
      desc: "Do'konlar pul yechganda 1–2% komissiya",
      example: "1% × 50M UZS/oy = 500K UZS",
      potential: "10M+ UZS/oy",
      color: "#7C3AED",
    },
    {
      icon: "🏢",
      title: "B2B & Korporativ",
      desc: "Qurilish kompaniyalariga maxsus shartnomalar",
      example: "Loyiha byudjeti: 5M–50M UZS",
      potential: "100M+ UZS/kontrakt",
      color: "#F59E0B",
    },
    {
      icon: "🎯",
      title: "Reklama & Featured",
      desc: "Do'konlar uchun featured joylashuv, reklama",
      example: "500K UZS/oy reklamabanner",
      potential: "20M+ UZS/oy",
      color: "#EF4444",
    },
  ];

  const metrics = [
    { label: "O'zbekiston qurilish bozori", val: "$4.8B", sub: "2024 yil" },
    { label: "Maqsadli segment (SME)", val: "15,000+", sub: "qurilish do'konlari" },
    { label: "O'rtacha ijara narxi", val: "8,000", sub: "UZS/kun" },
    { label: "Konversiya imkoni", val: "3x", sub: "digital vs qog'oz" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 80%, rgba(245,158,11,0.08) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #1A6FDB, #22C55E, #F59E0B)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5vh]">
        <div className="mb-[2.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#F59E0B" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#F59E0B", fontWeight: 600 }}>Biznes Model</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.3vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            6 ta <span style={{ color: "#F59E0B" }}>daromad</span> oqimi
          </h2>
        </div>

        {/* Market metrics */}
        <div className="grid grid-cols-4 gap-[1.5vw] mb-[2.5vh]">
          {metrics.map(m => (
            <div key={m.label} className="rounded-xl p-[1.3vw]" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "2.2vw", color: "#F59E0B", lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "var(--c-muted)", marginTop: "0.4vh" }}>{m.label}</div>
              <div style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "var(--c-border)" }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Revenue streams */}
        <div className="grid grid-cols-3 gap-[1.2vw] flex-1">
          {streams.map(s => (
            <div key={s.title} className="rounded-xl p-[1.4vw] flex flex-col gap-[0.8vh]" style={{ background: "var(--c-card)", border: `1px solid ${s.color}30` }}>
              <div className="flex items-center gap-[0.7vw]">
                <span style={{ fontSize: "1.5vw" }}>{s.icon}</span>
                <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.25vw", color: s.color }}>{s.title}</h4>
              </div>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "rgba(238,244,255,0.65)", lineHeight: 1.35 }}>{s.desc}</p>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "var(--c-muted)", fontStyle: "italic" }}>{s.example}</p>
              <div className="mt-auto inline-flex items-center gap-[0.4vw]">
                <span style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "1.3vw", color: s.color }}>{s.potential}</span>
                <span style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "var(--c-muted)" }}>potensial</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
