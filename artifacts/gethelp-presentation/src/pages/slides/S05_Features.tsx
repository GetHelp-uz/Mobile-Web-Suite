export default function S05_Features() {
  const features = [
    { icon: "🔍", title: "Asbob qidirish", desc: "Viloyat, turum va narx bo'yicha filter", color: "#1A6FDB" },
    { icon: "📅", title: "Online Ijara", desc: "Real-vaqt mavjudlik va band qilish", color: "#FF6B1A" },
    { icon: "💳", title: "Ko'p to'lov", desc: "Click, Payme, Paynet, Naqd", color: "#22C55E" },
    { icon: "📱", title: "Mobil Ilova", desc: "iOS va Android uchun Expo app", color: "#F59E0B" },
    { icon: "🤖", title: "AI Yordamchi", desc: "Savollarga avtomatik javob", color: "#7C3AED" },
    { icon: "📩", title: "SMS Xabarnomalar", desc: "Ijara holati haqida xabar", color: "#06B6D4" },
    { icon: "🔐", title: "Xavfsizlik", desc: "PIN, biometrik, brute-force himoya", color: "#EF4444" },
    { icon: "📊", title: "Analitika", desc: "To'liq moliyaviy hisobotlar", color: "#10B981" },
    { icon: "🏷️", title: "Komissiya", desc: "Avto komissiya va to'lov tizimi", color: "#F59E0B" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 80% 30%, rgba(255,107,26,0.07) 0%, transparent 60%)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[6vh]">
        <div className="mb-[3.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1.5vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-primary)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-primary)", fontWeight: 600 }}>Imkoniyatlar</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.8vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            To'liq funksional platforma
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-[1.8vw] flex items-start gap-[1.2vw]"
              style={{ background: "var(--c-card)", border: `1px solid ${f.color}25` }}
            >
              <div
                className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: "4.5vw", height: "4.5vw", background: `${f.color}18`, fontSize: "2.2vw" }}
              >
                {f.icon}
              </div>
              <div>
                <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.5vw", color: f.color, marginBottom: "0.6vh", lineHeight: 1.1 }}>{f.title}</h4>
                <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.25vw", color: "rgba(238,244,255,0.65)", lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
