export default function S04_Roles() {
  const roles = [
    {
      icon: "👑",
      name: "Super Admin",
      color: "#7C3AED",
      bg: "#7C3AED18",
      items: ["Barcha foydalanuvchi boshqaruvi", "Komissiya va tariflar", "AI yordamchi sozlash", "Moliyaviy hisobotlar", "Plaginslar boshqaruvi"],
    },
    {
      icon: "🏪",
      name: "Do'kon Egasi",
      color: "#FF6B1A",
      bg: "#FF6B1A18",
      items: ["Asbob qo'shish va boshqarish", "Ijara so'rovlarini tasdiqlash", "Daromad va statistika", "Ishchilarni tayinlash", "Hujjatlarni yuklash"],
    },
    {
      icon: "🔧",
      name: "Ishchi",
      color: "#22C55E",
      bg: "#22C55E18",
      items: ["Ijara jarayonini yuritish", "QR-kod skanerlash", "Asbob qaytarish tasdiqlash", "Topshiriqlar ro'yxati", "Mobil ilova orqali"],
    },
    {
      icon: "👤",
      name: "Mijoz",
      color: "#1A6FDB",
      bg: "#1A6FDB18",
      items: ["Asbob qidirish va filtrlash", "Onlayn buyurtma berish", "To'lov (Click/Payme)", "Ijara tarixi ko'rish", "Hujjat yuklash"],
    },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "var(--c-bg)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(26,111,219,0.08) 0%, transparent 60%)" }} />

      <div className="relative flex flex-col h-full px-[6vw] py-[6vh]">
        {/* Header */}
        <div className="mb-[4vh]">
          <div className="flex items-center gap-[1vw] mb-[1.5vh]">
            <div style={{ width: "3vw", height: "0.4vh", background: "var(--c-accent)" }} />
            <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.2vw", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--c-accent)", fontWeight: 600 }}>Foydalanuvchilar</span>
          </div>
          <h2 style={{ fontFamily: "var(--ff-display)", fontWeight: 800, fontSize: "3.8vw", letterSpacing: "-0.02em", color: "var(--c-text)", lineHeight: 1 }}>
            4 ta rol — 1 ta platforma
          </h2>
        </div>

        {/* Roles grid */}
        <div className="flex gap-[1.8vw] flex-1">
          {roles.map((r) => (
            <div
              key={r.name}
              className="flex-1 rounded-2xl p-[2vw] flex flex-col gap-[1.5vh]"
              style={{ background: r.bg, border: `1px solid ${r.color}40` }}
            >
              <div className="flex items-center gap-[0.8vw]">
                <span style={{ fontSize: "2.5vw" }}>{r.icon}</span>
                <h3 style={{ fontFamily: "var(--ff-display)", fontWeight: 700, fontSize: "1.7vw", color: r.color, lineHeight: 1.1 }}>{r.name}</h3>
              </div>
              <div className="h-[1px]" style={{ background: `${r.color}30` }} />
              <div className="flex flex-col gap-[1.2vh]">
                {r.items.map((item) => (
                  <div key={item} className="flex items-start gap-[0.6vw]">
                    <div style={{ width: "0.5vw", height: "0.5vw", borderRadius: "50%", background: r.color, marginTop: "0.7vh", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--ff-body)", fontSize: "1.35vw", color: "rgba(238,244,255,0.82)", lineHeight: 1.3 }}>{item}</span>
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
