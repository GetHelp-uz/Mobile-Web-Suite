export default function S15_TechStack() {
  const layers = [
    {
      label: "Frontend",
      color: "#1A6FDB",
      tech: [
        { name: "React 18", desc: "UI framework" },
        { name: "Vite 7", desc: "Build tool" },
        { name: "TypeScript", desc: "Tip xavfsizligi" },
        { name: "Tailwind CSS", desc: "Stil" },
        { name: "shadcn/ui", desc: "Komponent kutubxona" },
        { name: "Recharts", desc: "Grafik" },
      ],
    },
    {
      label: "Mobile",
      color: "#7C3AED",
      tech: [
        { name: "Expo SDK 52", desc: "React Native" },
        { name: "iOS + Android", desc: "Bitta kod" },
        { name: "Camera API", desc: "QR + hujjat" },
        { name: "Push Notify", desc: "Expo Notifications" },
        { name: "GPS Location", desc: "Yaqin do'konlar" },
        { name: "Biometrik", desc: "Barmoq izi" },
      ],
    },
    {
      label: "Backend",
      color: "#FF6B1A",
      tech: [
        { name: "Node.js", desc: "Runtime" },
        { name: "Express 4", desc: "REST API" },
        { name: "PostgreSQL", desc: "Ma'lumotlar bazasi" },
        { name: "Drizzle ORM", desc: "Type-safe SQL" },
        { name: "JWT Auth", desc: "Token autentifikatsiya" },
        { name: "tsx", desc: "TypeScript runner" },
      ],
    },
    {
      label: "Infratuzilma",
      color: "#22C55E",
      tech: [
        { name: "pnpm Monorepo", desc: "Yagona repo" },
        { name: "Replit Hosting", desc: "Cloud deployment" },
        { name: "Helmet", desc: "Xavfsizlik headers" },
        { name: "Rate Limit", desc: "DDoS himoya" },
        { name: "CORS", desc: "Domen nazorat" },
        { name: "Audit Logs", desc: "Barcha harakatlar" },
      ],
    },
  ];

  const integrations = [
    { name: "Click", cat: "To'lov" }, { name: "Payme", cat: "To'lov" },
    { name: "Paynet", cat: "To'lov" }, { name: "Uzum Bank", cat: "To'lov" },
    { name: "OpenAI GPT-4", cat: "AI" }, { name: "Eskiz SMS", cat: "SMS" },
    { name: "PlayMobile", cat: "SMS" }, { name: "Twilio", cat: "SMS" },
    { name: "Google Maps", cat: "Xarita" }, { name: "Firebase Push", cat: "Notify" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 60% at 80% 60%, rgba(255,107,26,0.07) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #1A6FDB, #7C3AED, #FF6B1A, #22C55E)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5vh]">
        <div className="mb-[2.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-primary)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-primary)", fontWeight: 600 }}>Texnologiya</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.3vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            Zamonaviy va <span style={{ color: "var(--c-primary)" }}>kengayadigan</span> arxitektura
          </h2>
        </div>

        {/* Tech layers */}
        <div className="flex gap-[1.5vw] mb-[2.5vh]">
          {layers.map(layer => (
            <div key={layer.label} className="flex-1 rounded-xl p-[1.3vw]" style={{ background: "var(--c-card)", border: `1px solid ${layer.color}30` }}>
              <div className="flex items-center gap-[0.6vw] mb-[1.5vh]">
                <div style={{ width: "0.5vw", height: "2.5vh", borderRadius: "4px", background: layer.color }} />
                <span style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.3vw", color: layer.color }}>{layer.label}</span>
              </div>
              <div className="flex flex-col gap-[0.6vh]">
                {layer.tech.map(t => (
                  <div key={t.name} className="flex items-center justify-between">
                    <span style={{ fontFamily: "var(--ff-body)", fontWeight: 600, fontSize: "1.1vw", color: "var(--c-text)" }}>{t.name}</span>
                    <span style={{ fontFamily: "var(--ff-body)", fontSize: "0.95vw", color: "var(--c-muted)" }}>{t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Integrations */}
        <div className="rounded-xl p-[1.5vw]" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "var(--c-muted)", marginBottom: "1.2vh" }}>Tashqi integratsiyalar</p>
          <div className="flex flex-wrap gap-[0.8vw]">
            {integrations.map(i => (
              <div key={i.name} className="flex items-center gap-[0.5vw] rounded-full px-[1vw] py-[0.5vh]" style={{ background: "var(--c-card)", border: "1px solid var(--c-border)" }}>
                <span style={{ fontFamily: "var(--ff-body)", fontWeight: 600, fontSize: "1.1vw", color: "var(--c-text)" }}>{i.name}</span>
                <span className="rounded-full px-[0.5vw] py-[0.2vh]" style={{ background: "var(--c-border)", fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "var(--c-muted)" }}>{i.cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
