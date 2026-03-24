export default function S18_CTA() {
  const asks = [
    {
      icon: "💰",
      title: "Investitsiya",
      amount: "$300,000",
      desc: "Seed round. 18 oy uchun: marketing, jamoa kengaytirish, texnik infratuzilma.",
      color: "#F59E0B",
    },
    {
      icon: "🤝",
      title: "Strategik Hamkor",
      amount: "B2B",
      desc: "Qurilish kompaniyalari, molyarlar birlashmalari, bank hamkorligi.",
      color: "#1A6FDB",
    },
    {
      icon: "🏪",
      title: "Beta Do'konlar",
      amount: "10 ta",
      desc: "Toshkentdagi ilk 10 beta do'kon uchun maxsus shartnoma va imtiyozlar.",
      color: "#22C55E",
    },
  ];

  const team = [
    { role: "CEO & Founder", name: "GetHelp Jamoasi", sub: "Biznes strateg va mahsulot" },
    { role: "CTO", name: "Tech Lead", sub: "Full-stack, 5 yil tajriba" },
    { role: "CMO", name: "Marketing", sub: "Digital va B2B marketing" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      {/* Big radial glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(26,111,219,0.13) 0%, transparent 60%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.6vh]" style={{ background: "linear-gradient(90deg, var(--c-primary), var(--c-accent), var(--c-gold))" }} />

      {/* Bottom watermark */}
      <div className="absolute bottom-[-5vh] right-[-3vw]" style={{ fontFamily: "var(--ff-display)", fontSize: "25vw", fontWeight: 900, color: "rgba(26,111,219,0.04)", lineHeight: 1, userSelect: "none" }}>G</div>

      <div className="relative flex flex-col h-full px-[7vw] py-[6vh]">
        {/* Header */}
        <div className="text-center mb-[4vh]">
          <div className="inline-flex items-center gap-[1.5vw] mb-[2vh]">
            <div className="rounded-2xl flex items-center justify-center" style={{ width: "5vw", height: "5vw", background: "linear-gradient(135deg, var(--c-primary), var(--c-accent))" }}>
              <span style={{ fontSize: "2.5vw" }}>🔧</span>
            </div>
            <h1 style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "4.5vw", letterSpacing: "-0.03em", color: "var(--c-text)" }}>
              GetHelp<span style={{ color: "var(--c-accent)" }}>.uz</span>
            </h1>
          </div>
          <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.7vw", color: "rgba(238,244,255,0.7)", lineHeight: 1.4, maxWidth: "55vw", margin: "0 auto" }}>
            O'zbekistonning <strong style={{ color: "var(--c-text)" }}>birinchi</strong> to'liq raqamli qurilish asboblari ijarasi platformasi.
            Biz sarmoyachi va hamkorlar qidiryapmiz.
          </p>
        </div>

        <div className="flex gap-[2vw] mb-[3.5vh]">
          {asks.map(a => (
            <div key={a.title} className="flex-1 rounded-2xl p-[2vw]" style={{ background: "var(--c-card)", border: `1px solid ${a.color}40` }}>
              <div style={{ fontSize: "2.5vw", marginBottom: "1vh" }}>{a.icon}</div>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "2.5vw", color: a.color, lineHeight: 1, marginBottom: "0.5vh" }}>{a.amount}</div>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.4vw", color: "var(--c-text)", marginBottom: "1vh" }}>{a.title}</div>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "rgba(238,244,255,0.65)", lineHeight: 1.4 }}>{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-[3vw]">
          {/* Team */}
          <div className="flex gap-[2vw]">
            {team.map(m => (
              <div key={m.role} className="flex items-center gap-[1vw] rounded-xl px-[1.5vw] py-[1.2vh]" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                <div className="rounded-full flex items-center justify-center" style={{ width: "3.5vw", height: "3.5vw", background: "var(--c-primary)", fontSize: "1.6vw" }}>👤</div>
                <div>
                  <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.2vw", color: "var(--c-text)" }}>{m.role}</div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "var(--c-muted)" }}>{m.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1 h-[1px]" style={{ background: "var(--c-border)" }} />

          {/* Contact */}
          <div className="flex flex-col gap-[0.8vh] text-right">
            {[
              { icon: "🌐", text: "gethelp.uz" },
              { icon: "📧", text: "hello@gethelp.uz" },
              { icon: "📱", text: "+998 XX XXX XX XX" },
              { icon: "📍", text: "Toshkent, O'zbekiston" },
            ].map(c => (
              <div key={c.text} className="flex items-center justify-end gap-[0.6vw]">
                <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.25vw", color: "rgba(238,244,255,0.75)" }}>{c.text}</span>
                <span style={{ fontSize: "1.2vw" }}>{c.icon}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
