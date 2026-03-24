export default function S14_B2BEnterprise() {
  const b2bFeatures = [
    { icon: "🏢", title: "Korporativ Hisob", desc: "Kompaniya nomi, soliq raqami, korporativ shartnomalar va maxsus narxlar", color: "#1A6FDB" },
    { icon: "🏗️", title: "Loyiha Boshqaruvi", desc: "Har bir qurilish loyihasi uchun alohida byudjet, ijaralar va hisobot", color: "#FF6B1A" },
    { icon: "🌿", title: "Filiallar Tizimi", desc: "Zanjir do'konlar uchun markaziy boshqaruv, filial statistikasi", color: "#22C55E" },
    { icon: "📦", title: "Yetkazib Berish", desc: "Asbob yetkazish/olib ketish optsionu. Haydovchi tayinlash va GPS kuzatuv", color: "#7C3AED" },
    { icon: "📝", title: "Raqamli Shartnomalar", desc: "PDF shartnoma, elektron imzo, huquqiy hujjatlar arxivi", color: "#F59E0B" },
    { icon: "🛒", title: "Peer-to-Peer Bozor", desc: "Jismoniy shaxslar o'rtasida asbob ijarasi (Airbnb modeli)", color: "#EF4444" },
  ];

  const subscriptionPlans = [
    { name: "Starter", price: "99K", period: "oy", items: ["1 do'kon", "50 asbob", "SMS: 100ta", "Standart support"], color: "#1A6FDB" },
    { name: "Professional", price: "299K", period: "oy", items: ["3 do'kon", "200 asbob", "SMS: 500ta", "AI + Analitika"], color: "#FF6B1A", highlight: true },
    { name: "Enterprise", price: "Uchrashuv", period: "", items: ["Cheksiz do'kon", "Cheksiz asbob", "SMS: 2000+", "Maxsus integratsiya"], color: "#7C3AED" },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 40% 20%, rgba(26,111,219,0.08) 0%, transparent 55%)" }} />
      <div className="absolute top-0 left-0 right-0 h-[0.5vh]" style={{ background: "linear-gradient(90deg, #1A6FDB, #F59E0B, #EF4444)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[5vh]">
        <div className="mb-[2.5vh]">
          <div className="flex items-center gap-[1vw] mb-[1vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "#1A6FDB" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "#1A6FDB", fontWeight: 600 }}>B2B & Enterprise</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.3vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            Korporativ va katta miqyosli <span style={{ color: "#1A6FDB" }}>yechimlar</span>
          </h2>
        </div>

        <div className="flex gap-[2.5vw] flex-1">
          {/* Left: B2B features */}
          <div className="grid grid-cols-2 gap-[1.2vw]" style={{ flex: "1.2" }}>
            {b2bFeatures.map(f => (
              <div key={f.title} className="rounded-xl p-[1.3vw]" style={{ background: "var(--c-card)", border: `1px solid ${f.color}25` }}>
                <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
                  <span style={{ fontSize: "1.6vw" }}>{f.icon}</span>
                  <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.2vw", color: f.color }}>{f.title}</h4>
                </div>
                <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "rgba(238,244,255,0.62)", lineHeight: 1.35 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Right: Subscription plans */}
          <div style={{ width: "30vw" }}>
            <p style={{ fontFamily: "var(--ff-body)", fontSize: "1.15vw", color: "var(--c-muted)", marginBottom: "1.5vh" }}>Obuna rejalari</p>
            <div className="flex flex-col gap-[1.2vw]">
              {subscriptionPlans.map(p => (
                <div
                  key={p.name}
                  className="rounded-2xl p-[1.5vw]"
                  style={{
                    background: p.highlight ? `${p.color}18` : "var(--c-card)",
                    border: `${p.highlight ? "2px" : "1px"} solid ${p.color}${p.highlight ? "60" : "30"}`,
                  }}
                >
                  <div className="flex items-center justify-between mb-[1.2vh]">
                    <h4 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.4vw", color: p.color }}>{p.name}</h4>
                    <div className="text-right">
                      <span style={{ fontFamily: "var(--ff-display)", fontWeight: 900, fontSize: "1.8vw", color: p.color }}>{p.price}</span>
                      {p.period && <span style={{ fontFamily: "var(--ff-body)", fontSize: "0.9vw", color: "var(--c-muted)" }}>/{p.period}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-[0.5vw]">
                    {p.items.map(item => (
                      <span key={item} className="inline-flex items-center gap-[0.3vw]" style={{ fontFamily: "var(--ff-body)", fontSize: "1vw", color: "rgba(238,244,255,0.7)" }}>
                        <span style={{ color: p.color }}>✓</span> {item}
                      </span>
                    ))}
                  </div>
                  {p.highlight && (
                    <div className="mt-[1.2vh] text-center rounded-lg py-[0.6vh]" style={{ background: p.color, fontFamily: "var(--ff-body)", fontSize: "1.05vw", color: "#fff", fontWeight: 600 }}>
                      Eng mashhur
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
