const base = import.meta.env.BASE_URL;

export default function S02_Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      {/* Right side image */}
      <div className="absolute right-0 top-0 bottom-0" style={{ width: "48vw" }}>
        <img
          src={`${base}img-problem.png`}
          crossOrigin="anonymous"
          alt="Muammo"
          className="w-full h-full object-cover"
          style={{ opacity: 0.7 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, var(--c-bg) 0%, rgba(7,14,28,0.2) 50%, transparent 100%)" }} />
      </div>

      {/* Left content */}
      <div className="relative flex flex-col h-full px-[7vw] py-[8vh] justify-between" style={{ maxWidth: "60vw" }}>
        {/* Label */}
        <div className="flex items-center gap-[1vw]">
          <div style={{ width: "3.5vw", height: "0.5vh", background: "var(--c-accent)", borderRadius: "4px" }} />
          <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.3vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-accent)", fontWeight: 600 }}>Muammo</span>
        </div>

        {/* Main content */}
        <div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "4.5vw", lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--c-text)", marginBottom: "4vh" }}>
            Qurilish asboblari<br />
            <span style={{ color: "var(--c-accent)" }}>chalkash</span> va<br />
            qimmat
          </h2>

          <div className="flex flex-col gap-[2.2vh]">
            {[
              { icon: "🔍", text: "Asbob topish uchun ko'p vaqt va kuch sarflanadi" },
              { icon: "💸", text: "Kamdan-kam ishlatiladigan asboblarni sotib olish arzon emas" },
              { icon: "📵", text: "Do'konlar bilan muloqot telefon va shaxsiy kelishuvga asoslanadi" },
              { icon: "📋", text: "Ijara jarayoni qog'oz va qo'lda hisob-kitob bilan amalga oshiriladi" },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-start gap-[1.5vw]">
                <div style={{ fontSize: "2vw", lineHeight: 1, flexShrink: 0, marginTop: "0.2vw" }}>{icon}</div>
                <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.7vw", color: "rgba(238,244,255,0.8)", lineHeight: 1.4 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.4vw", color: "var(--c-muted)" }}>
          O'zbekistonda <span style={{ color: "var(--c-text)", fontWeight: 600 }}>millionlab</span> qurilish ishchi va korxonalar shu muammodan aziyat chekmoqda
        </div>
      </div>
    </div>
  );
}
