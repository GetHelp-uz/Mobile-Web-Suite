export default function S17_Roadmap() {
  const phases = [
    {
      phase: "Q1 2025",
      title: "MVP Tayyor",
      status: "done",
      color: "#22C55E",
      items: [
        "4 rol (mijoz, do'kon, ishchi, admin)",
        "Click, Payme, Paynet, Uzum Bank",
        "QR skanerlash + ijara boshqaruvi",
        "AI chatbot (GPT-4) va tavsiy tizimi",
        "SMS bildirishnomalar (Eskiz)",
        "Hamyon va escrow tizimi",
        "Mobil ilova (Expo iOS/Android)",
      ],
    },
    {
      phase: "Q2 2025",
      title: "Bozorga Chiqish",
      status: "current",
      color: "#1A6FDB",
      items: [
        "5-10 beta do'kon (Toshkent)",
        "Mijozlar fikr-mulohazasi",
        "Marketing va SMM kampaniya",
        "B2B pilot loyihalar",
        "Analytics yaxshilash",
        "Korporativ hisob tizimi",
      ],
    },
    {
      phase: "Q3 2025",
      title: "Kengayish",
      status: "planned",
      color: "#FF6B1A",
      items: [
        "50+ do'kon onboarding",
        "Viloyatlar — Samarqand, Namangan",
        "Yetkazib berish moduli",
        "Peer-to-peer bozor (beta)",
        "Korporativ shartnomalar",
        "ERP integratsiyalari",
      ],
    },
    {
      phase: "Q4 2025",
      title: "Miqyoslash",
      status: "planned",
      color: "#7C3AED",
      items: [
        "200+ do'kon O'zbekiston bo'ylab",
        "Qo'shni mamlakatlar (Qozog'iston, Tojikiston)",
        "AI talab bashorat (ML pipeline)",
        "IPO/Series A tayyorgarlik",
        "Insurtech integratsiyasi",
        "Open API (3rd party)",
      ],
    },
  ];

  const kpis = [
    { label: "Do'konlar (2025 oxiri)", val: "200+", color: "#FF6B1A" },
    { label: "Oylik ijaralar", val: "5,000+", color: "#1A6FDB" },
    { label: "GMV (oylik)", val: "5B UZS", color: "#22C55E" },
    { label: "MAU", val: "10,000+", color: "#7C3AED" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 100%, rgba(26,111,219,0.08) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #22C55E, #1A6FDB, #FF6B1A, #7C3AED)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5vh]">
        <div className="mb-[2.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#1A6FDB" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1A6FDB", fontWeight: 600 }}>Yo'l Xaritasi</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.3vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            2025 — <span style={{ color: "#22C55E" }}>MVP dan</span> miqyosgacha
          </h2>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-[1.5vw] mb-[2.5vh]">
          {kpis.map(k => (
            <div key={k.label} className="rounded-xl p-[1.2vw] text-center" style={{ background: "var(--c-card)", border: `1px solid ${k.color}30` }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "2.5vw", color: k.color, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "var(--c-muted)", marginTop: "0.5vh" }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Roadmap phases */}
        <div className="flex gap-[1.5vw] flex-1">
          {phases.map(p => (
            <div
              key={p.phase}
              className="flex-1 rounded-xl p-[1.4vw] flex flex-col gap-[1vh]"
              style={{
                background: p.status === "current" ? `${p.color}12` : "var(--c-card)",
                border: `${p.status === "current" ? "2px" : "1px"} solid ${p.color}${p.status === "current" ? "50" : "30"}`,
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-[0.5vh]">
                  <span style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: p.color, fontWeight: 600, letterSpacing: "0.1em" }}>{p.phase}</span>
                  <span className="rounded-full px-[0.7vw] py-[0.2vh]" style={{ background: `${p.color}18`, color: p.color, fontFamily: "var(--ff-body)", fontSize: "0.85vw", fontWeight: 600 }}>
                    {p.status === "done" ? "✓ Tayyor" : p.status === "current" ? "⚡ Hozir" : "📅 Rejalashtirildi"}
                  </span>
                </div>
                <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.4vw", color: p.color, lineHeight: 1.1 }}>{p.title}</h4>
              </div>
              <div className="h-[2px] rounded-full" style={{ background: `${p.color}30` }} />
              <div className="flex flex-col gap-[0.6vh]">
                {p.items.map(item => (
                  <div key={item} className="flex items-start gap-[0.5vw]">
                    <span style={{ color: p.color, fontSize: "0.85vw", marginTop: "0.2vh", flexShrink: 0 }}>
                      {p.status === "done" ? "✓" : "→"}
                    </span>
                    <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "rgba(238,244,255,0.72)", lineHeight: 1.3 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
