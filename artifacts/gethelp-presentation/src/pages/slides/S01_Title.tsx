const base = import.meta.env.BASE_URL;

export default function S01_Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      {/* Hero image */}
      <img
        src={`${base}img-hero.png`}
        crossOrigin="anonymous"
        alt="Qurilish asboblari"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45 }}
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(7,14,28,0.92) 0%, rgba(7,14,28,0.55) 60%, rgba(26,111,219,0.18) 100%)" }} />

      {/* Orange top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[0.6vh]" style={{ background: "linear-gradient(90deg, var(--c-accent), var(--c-primary))" }} />

      <div className="relative flex flex-col h-full px-[8vw] py-[8vh] justify-between">
        {/* Top: Logo + tagline */}
        <div className="flex items-center gap-[1.2vw]">
          <div className="flex items-center justify-center rounded-xl" style={{ width: "4.5vw", height: "4.5vw", background: "var(--c-primary)" }}>
            <svg viewBox="0 0 40 40" fill="none" style={{ width: "2.6vw", height: "2.6vw" }}>
              <path d="M8 32L20 8l12 24" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 24h16" stroke="#FF6B1A" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "2.2vw", color: "var(--c-text)", letterSpacing: "-0.02em" }}>GetHelp.uz</div>
            <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "var(--c-muted)", letterSpacing: "0.12em", textTransform: "uppercase" }}>O'zbekiston — Qurilish Asboblari Platformasi</div>
          </div>
        </div>

        {/* Center: Main title */}
        <div style={{ maxWidth: "72vw" }}>
          <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.4vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-accent)", fontWeight: 600, marginBottom: "2vh" }}>
            Mahsulot Taqdimoti • 2025
          </div>
          <h1 style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "6.5vw", lineHeight: 0.93, letterSpacing: "-0.03em", color: "var(--c-text)", marginBottom: "3.5vh" }}>
            Asbob ijara —<br />
            <span style={{ color: "var(--c-accent)" }}>aqlli</span> va <span style={{ color: "var(--c-primary)" }}>tez</span>
          </h1>
          <p style={{ fontFamily: "var(--ff-body)", fontSize: "2vw", color: "rgba(238,244,255,0.75)", lineHeight: 1.5, maxWidth: "55vw" }}>
            Qurilish asbob-uskunalarini ijara qilish va boshqarish uchun to'liq raqamli ekotizim
          </p>
        </div>

        {/* Bottom: Date + stats row */}
        <div className="flex items-end justify-between">
          <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.5vw", color: "var(--c-muted)" }}>
            <span style={{ color: "var(--c-text)" }}>2025 yil</span> • Toshkent, O'zbekiston
          </div>
          <div className="flex gap-[4vw]">
            {[["4", "Rol"], ["3+", "To'lov"], ["100%", "Mahalliy"]].map(([n, l]) => (
              <div key={l} className="text-right">
                <div style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3vw", color: "var(--c-accent)", lineHeight: 1 }}>{n}</div>
                <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "var(--c-muted)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
