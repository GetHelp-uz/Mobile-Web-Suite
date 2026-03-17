export default function S03_Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      {/* Background radial glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(26,111,219,0.12) 0%, transparent 70%)" }} />

      {/* Top accent */}
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, var(--c-primary), var(--c-accent))" }} />

      <div className="relative flex flex-col items-center h-full px-[6vw] py-[7vh]">
        {/* Label */}
        <div className="flex flex-col items-center gap-[1.5vh] mb-[5vh]">
          <div className="flex items-center gap-[1vw]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-primary)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.3vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-primary)", fontWeight: 600 }}>Yechim</span>
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-primary)" }} />
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "4.2vw", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--c-text)", textAlign: "center" }}>
            <span style={{ color: "var(--c-primary)" }}>GetHelp.uz</span> — qurilish asboblarini<br />
            ijara qilishning eng <span style={{ color: "var(--c-accent)" }}>aqlli</span> yo'li
          </h2>
        </div>

        {/* Three pillars */}
        <div className="flex gap-[2.5vw] w-full">
          {[
            {
              num: "01",
              title: "Topish",
              color: "var(--c-primary)",
              desc: "Har qanday asbobni yaqin atrofdagi do'konlardan tez toping. Narx, muddatlarni solishtiring.",
              icon: "🔎",
            },
            {
              num: "02",
              title: "Buyurtma",
              color: "var(--c-accent)",
              desc: "Ilova yoki web orqali buyurtma bering. Click, Payme, Paynet yoki naqd to'lov.",
              icon: "📱",
            },
            {
              num: "03",
              title: "Foydalaning",
              color: "var(--c-gold)",
              desc: "Asbob yetkaziladi yoki olib ketiladi. Ijara muddati tugagach — qaytarib bering.",
              icon: "🛠️",
            },
          ].map(({ num, title, color, desc, icon }) => (
            <div
              key={num}
              className="flex-1 flex flex-col gap-[2vh] rounded-2xl p-[2.5vw]"
              style={{ background: "var(--c-card)", border: `1px solid ${color}30` }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "3.5vw", color, opacity: 0.25, lineHeight: 1 }}>{num}</span>
                <span style={{ fontSize: "2.8vw" }}>{icon}</span>
              </div>
              <h3 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "2.2vw", color, lineHeight: 1 }}>{title}</h3>
              <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.5vw", color: "rgba(238,244,255,0.72)", lineHeight: 1.5 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom tagline */}
        <div className="mt-[4.5vh] flex items-center gap-[2vw]">
          <div className="flex-1 h-[1px]" style={{ background: "var(--c-border)" }} />
          <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.6vw", color: "var(--c-muted)", textAlign: "center" }}>
            Bir platformada — <span style={{ color: "var(--c-text)" }}>mijoz, ishchi, do'kon egasi va admin</span>
          </p>
          <div className="flex-1 h-[1px]" style={{ background: "var(--c-border)" }} />
        </div>
      </div>
    </div>
  );
}
