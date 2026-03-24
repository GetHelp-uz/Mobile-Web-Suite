export default function S09_WorkerApp() {
  const features = [
    { icon: "📲", title: "QR-kod skanerlash", desc: "Asbobni berish/qabul qilishda QR orqali tasdiqlash. Xatolar 0 ga tushadi.", color: "#22C55E" },
    { icon: "📋", title: "Topshiriqlar", desc: "Admin tomonidan berilgan kunlik topshiriqlar ro'yxati va prioritet tartib.", color: "#1A6FDB" },
    { icon: "🗓️", title: "Ish rejasi", desc: "Haftalik jadval, dam olish kunlari va ish vaqti hisobi.", color: "#F59E0B" },
    { icon: "📈", title: "KPI & Baho", desc: "Bajarilgan ijaralar, mijoz baholari va ishlash samaradorligi.", color: "#FF6B1A" },
    { icon: "⚠️", title: "Zarar hisob-kitobi", desc: "Asbob qaytarilganda zarar aniqlanadi va depozitdan ushlab qolinadi.", color: "#EF4444" },
    { icon: "🔧", title: "Texnik ta'mir", desc: "Ta'mirga yuborilgan asboblarni kuzatish va holat yangilash.", color: "#7C3AED" },
  ];

  const qrSteps = [
    { step: "1", text: "Mijoz QR kodni ko'rsatadi" },
    { step: "2", text: "Ishchi skanerlaydi" },
    { step: "3", text: "Tizim avtomatik tasdiqlaydi" },
    { step: "4", text: "SMS — mijoz va do'konga" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 30% 80%, rgba(34,197,94,0.08) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #22C55E, #1A6FDB)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5.5vh]">
        <div className="mb-[3vh]">
          <div className="flex items-center gap-[1vw] mb-[1.2vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#22C55E" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#22C55E", fontWeight: 600 }}>Ishchi</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.5vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1.05 }}>
            Ishchi — samarali va <span style={{ color: "#22C55E" }}>aniq</span>
          </h2>
        </div>

        <div className="flex gap-[3vw] flex-1">
          {/* Left: features grid */}
          <div className="flex-1 grid grid-cols-2 gap-[1.4vw]">
            {features.map(f => (
              <div key={f.title} className="rounded-xl p-[1.4vw]" style={{ background: "var(--c-card)", border: `1px solid ${f.color}30` }}>
                <div className="flex items-center gap-[0.8vw] mb-[1vh]">
                  <span style={{ fontSize: "1.8vw" }}>{f.icon}</span>
                  <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.3vw", color: f.color }}>{f.title}</h4>
                </div>
                <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.15vw", color: "rgba(238,244,255,0.65)", lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Right: QR flow */}
          <div style={{ width: "28vw" }}>
            <div className="rounded-2xl p-[2vw] h-full" style={{ background: "var(--c-card)", border: "1px solid #22C55E30" }}>
              <div style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.5vw", color: "#22C55E", marginBottom: "2vh" }}>
                QR Ijara Jarayoni
              </div>

              {/* QR visual */}
              <div className="flex items-center justify-center mb-[2.5vh]">
                <div className="rounded-2xl p-[2vw]" style={{ background: "var(--c-bg)", border: "2px dashed #22C55E50" }}>
                  <div className="grid grid-cols-5 gap-[0.3vw]">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} style={{ width: "1.2vw", height: "1.2vw", borderRadius: "2px", background: [0,1,2,3,4,5,6,10,11,15,16,17,18,19,20,21,22,23,24].includes(i) ? "#22C55E" : "transparent" }} />
                    ))}
                  </div>
                  <div style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "#22C55E", textAlign: "center", marginTop: "0.8vh" }}>IJARA #2847</div>
                </div>
              </div>

              {/* Steps */}
              <div className="flex flex-col gap-[1.5vh]">
                {qrSteps.map(s => (
                  <div key={s.step} className="flex items-center gap-[1.2vw]">
                    <div className="flex items-center justify-center flex-shrink-0 rounded-full" style={{ width: "2.5vw", height: "2.5vw", background: "#22C55E18", border: "1.5px solid #22C55E", fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.2vw", color: "#22C55E" }}>
                      {s.step}
                    </div>
                    <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "rgba(238,244,255,0.78)" }}>{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Result badge */}
              <div className="mt-[2.5vh] rounded-xl px-[1.2vw] py-[1.2vh] flex items-center gap-[0.8vw]" style={{ background: "#22C55E18" }}>
                <span style={{ fontSize: "1.5vw" }}>⚡</span>
                <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", color: "#22C55E", fontWeight: 600 }}>
                  Jarayon 15 soniyada tugaydi
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
