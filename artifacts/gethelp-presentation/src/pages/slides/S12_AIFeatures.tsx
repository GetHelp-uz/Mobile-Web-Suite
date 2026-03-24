export default function S12_AIFeatures() {
  const features = [
    {
      icon: "🤖",
      title: "AI Chatbot",
      color: "#7C3AED",
      desc: "Mijozlar savollariga 24/7 avtomatik javob. GPT-4 asosida O'zbek tilida. Ijara narxi, mavjudlik, qoidalar haqida.",
      tags: ["GPT-4", "O'zbek til", "24/7"],
    },
    {
      icon: "🎯",
      title: "Aqlli Tavsiya",
      color: "#1A6FDB",
      desc: "Foydalanuvchi ijara tarixi va qidiruvlariga asoslanib asbob tavsiya qiladi. Konversiya 30% ga oshadi.",
      tags: ["Personalizatsiya", "ML algoritm", "+30% konversiya"],
    },
    {
      icon: "🛡️",
      title: "AI Admin Yordamchi",
      color: "#FF6B1A",
      desc: "Admin savollariga javob beradi, analitika tushuntiradi, g'ayritabiiy tranzaksiyalarni aniqlaydi.",
      tags: ["Fraud detection", "Analitika", "Tavsiya"],
    },
    {
      icon: "📊",
      title: "Talab Bashorat",
      color: "#22C55E",
      desc: "Mavsumga qarab asbob talabini bashorat qiladi. Do'kon egalari zaxirani oldindan rejalashtiradi.",
      tags: ["Forecasting", "Mavsumiy", "Optimallashtirish"],
    },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 60% at 60% 40%, rgba(124,58,237,0.1) 0%, transparent 60%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #7C3AED, #1A6FDB, #22C55E)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5.5vh]">
        <div className="mb-[3.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1.2vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#7C3AED" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7C3AED", fontWeight: 600 }}>Suniy Intellekt</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            AI — platformaning <span style={{ color: "#7C3AED" }}>aqli</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-[2vw] flex-1">
          {features.map(f => (
            <div key={f.title} className="rounded-2xl p-[2.2vw] flex flex-col gap-[1.5vh]" style={{ background: "var(--c-card)", border: `1px solid ${f.color}30` }}>
              <div className="flex items-center gap-[1vw]">
                <div className="rounded-2xl flex items-center justify-center flex-shrink-0" style={{ width: "5vw", height: "5vw", background: `${f.color}15`, fontSize: "2.5vw" }}>
                  {f.icon}
                </div>
                <h3 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.8vw", color: f.color, lineHeight: 1.1 }}>{f.title}</h3>
              </div>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.3vw", color: "rgba(238,244,255,0.72)", lineHeight: 1.5 }}>{f.desc}</p>
              <div className="flex flex-wrap gap-[0.5vw] mt-auto">
                {f.tags.map(tag => (
                  <span key={tag} className="px-[0.8vw] py-[0.4vh] rounded-full" style={{ background: `${f.color}15`, color: f.color, fontFamily: "var(--ff-body)", fontSize: "0.95vw", fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
