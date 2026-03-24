export default function S11_Payment() {
  const providers = [
    { name: "Click", color: "#00A3E0", logo: "💳", share: "35%", desc: "Karta + USSD" },
    { name: "Payme", color: "#0087CD", logo: "💙", share: "30%", desc: "Karta va QR" },
    { name: "Paynet", color: "#FF6B1A", logo: "🔶", share: "20%", desc: "Terminal + karta" },
    { name: "Uzum Bank", color: "#7C3AED", logo: "🟣", share: "10%", desc: "Checkout + To'lov" },
    { name: "Naqd", color: "#22C55E", logo: "💵", share: "5%", desc: "Jismoniy qabul" },
  ];

  const commTypes = [
    { type: "Ijara (do'kon)", rate: "10%", icon: "🏪", color: "#FF6B1A" },
    { type: "Ijara (mijoz)", rate: "0%", icon: "👤", color: "#1A6FDB" },
    { type: "Topup (mijoz)", rate: "0%", icon: "⬆️", color: "#7C3AED" },
    { type: "Topup (do'kon)", rate: "0%", icon: "🏪⬆️", color: "#7C3AED" },
    { type: "Yechish (mijoz)", rate: "2%", icon: "⬇️", color: "#F59E0B" },
    { type: "Yechish (do'kon)", rate: "1%", icon: "🏪⬇️", color: "#F59E0B" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 60% at 80% 50%, rgba(34,197,94,0.07) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #22C55E, #1A6FDB, #7C3AED)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5.5vh]">
        <div className="mb-[3vh]">
          <div className="flex items-center gap-[1vw] mb-[1.2vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#22C55E" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#22C55E", fontWeight: 600 }}>To'lov & Komissiya</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            O'zbek to'lov tizimlari + <span style={{ color: "#22C55E" }}>aqlli</span> komissiya
          </h2>
        </div>

        <div className="flex gap-[3vw] flex-1">
          {/* Left: providers */}
          <div className="flex-1">
            <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "var(--c-muted)", marginBottom: "1.8vh" }}>To'lov usullari (5 ta)</p>
            <div className="flex flex-col gap-[1.2vw]">
              {providers.map(p => (
                <div key={p.name} className="flex items-center gap-[1.5vw] rounded-xl p-[1.2vw]" style={{ background: "var(--c-card)", border: `1px solid ${p.color}30` }}>
                  <span style={{ fontSize: "1.8vw" }}>{p.logo}</span>
                  <div className="flex-1">
                    <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.4vw", color: p.color }}>{p.name}</div>
                    <div style={{ fontFamily: "var(--ff-body)", fontSize: "1.1vw", color: "var(--c-muted)" }}>{p.desc}</div>
                  </div>
                  {/* Bar */}
                  <div className="flex flex-col items-end gap-[0.3vh]">
                    <span style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "1.4vw", color: p.color }}>{p.share}</span>
                    <div style={{ width: "8vw", height: "0.5vh", borderRadius: "4px", background: "var(--c-border)" }}>
                      <div style={{ width: p.share, height: "100%", borderRadius: "4px", background: p.color }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: commission & escrow */}
          <div style={{ width: "40vw" }}>
            <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "var(--c-muted)", marginBottom: "1.8vh" }}>Komissiya turlari (6 ta, sozlanadi)</p>
            <div className="grid grid-cols-2 gap-[1vw] mb-[2vw]">
              {commTypes.map(c => (
                <div key={c.type} className="flex items-center justify-between rounded-xl px-[1.2vw] py-[1vh]" style={{ background: "var(--c-card)", border: `1px solid ${c.color}25` }}>
                  <div className="flex items-center gap-[0.6vw]">
                    <span style={{ fontSize: "1.1vw" }}>{c.icon}</span>
                    <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "rgba(238,244,255,0.75)" }}>{c.type}</span>
                  </div>
                  <span style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "1.3vw", color: c.color }}>{c.rate}</span>
                </div>
              ))}
            </div>

            {/* Escrow */}
            <div className="rounded-2xl p-[1.5vw]" style={{ background: "var(--c-card)", border: "1px solid #F59E0B30" }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.4vw", color: "#F59E0B", marginBottom: "1.2vh" }}>🔒 Escrow / Depozit tizimi</div>
              <div className="grid grid-cols-3 gap-[1vw]">
                {[
                  { step: "Depozit olinadi", desc: "Escrow holdga o'tadi", icon: "💰" },
                  { step: "Ijara davri", desc: "Pul ushlanib turadi", icon: "🔐" },
                  { step: "Asbob qaytarildi", desc: "Holat tekshirilib, pul qaytariladi", icon: "✅" },
                ].map(e => (
                  <div key={e.step} className="text-center">
                    <div style={{ fontSize: "1.8vw", marginBottom: "0.6vh" }}>{e.icon}</div>
                    <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.05vw", color: "#F59E0B", marginBottom: "0.3vh" }}>{e.step}</div>
                    <div style={{ fontFamily: "var(--ff-body)", fontSize: "0.95vw", color: "var(--c-muted)", lineHeight: 1.3 }}>{e.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
