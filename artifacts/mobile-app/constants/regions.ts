export interface District {
  id: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
  districts: District[];
}

export const REGIONS: Region[] = [
  {
    id: "toshkent-shahar",
    name: "Toshkent shahri",
    districts: [
      { id: "bektemir", name: "Bektemir" },
      { id: "chilonzor", name: "Chilonzor" },
      { id: "hamza", name: "Hamza" },
      { id: "mirobod", name: "Mirobod" },
      { id: "mirzo-ulugbek", name: "Mirzo Ulug'bek" },
      { id: "olmazor", name: "Olmazor" },
      { id: "sergeli", name: "Sergeli" },
      { id: "shayxontohur", name: "Shayxontohur" },
      { id: "uchtepa", name: "Uchtepa" },
      { id: "yakkasaroy", name: "Yakkasaroy" },
      { id: "yunusobod", name: "Yunusobod" },
    ],
  },
  {
    id: "toshkent-viloyat",
    name: "Toshkent viloyati",
    districts: [
      { id: "angren", name: "Angren" },
      { id: "bekabad", name: "Beka'bad" },
      { id: "bostonliq", name: "Bo'stonliq" },
      { id: "chinoz", name: "Chinoz" },
      { id: "qibray", name: "Qibray" },
      { id: "ohangaron", name: "Ohangaron" },
      { id: "ourtachirchiq", name: "O'rtachirchiq" },
      { id: "parkent", name: "Parkent" },
      { id: "piskent", name: "Piskent" },
      { id: "yangiyo'l", name: "Yangiyo'l" },
      { id: "zangiota", name: "Zangiota" },
    ],
  },
  {
    id: "andijon",
    name: "Andijon viloyati",
    districts: [
      { id: "andijon-shahar", name: "Andijon shahri" },
      { id: "asaka", name: "Asaka" },
      { id: "baliqchi", name: "Baliqchi" },
      { id: "boz", name: "Bo'z" },
      { id: "buloqboshi", name: "Buloqboshi" },
      { id: "izboskan", name: "Izboskan" },
      { id: "jalaquduq", name: "Jalaquduq" },
      { id: "marhamat", name: "Marhamat" },
      { id: "oltinkol", name: "Oltinko'l" },
      { id: "paxtaobod", name: "Paxtaobod" },
      { id: "shahrixon", name: "Shahrixon" },
      { id: "ulug'nor", name: "Ulug'nor" },
      { id: "xojaobod", name: "Xo'jaobod" },
    ],
  },
  {
    id: "fargona",
    name: "Farg'ona viloyati",
    districts: [
      { id: "beshariq", name: "Beshariq" },
      { id: "fargona-shahar", name: "Farg'ona shahri" },
      { id: "furqat", name: "Furqat" },
      { id: "margilon", name: "Marg'ilon" },
      { id: "oltiariq", name: "Oltiariq" },
      { id: "quva", name: "Quva" },
      { id: "qoqon", name: "Qo'qon" },
      { id: "rishton", name: "Rishton" },
      { id: "sox", name: "So'x" },
      { id: "toshloq", name: "Toshloq" },
      { id: "uchkoprik", name: "Uchko'prik" },
      { id: "yozyovon", name: "Yozyovon" },
    ],
  },
  {
    id: "namangan",
    name: "Namangan viloyati",
    districts: [
      { id: "chortoq", name: "Chortoq" },
      { id: "chust", name: "Chust" },
      { id: "kosonsoy", name: "Kosonsoy" },
      { id: "mingbuloq", name: "Mingbuloq" },
      { id: "namangan-shahar", name: "Namangan shahri" },
      { id: "norin", name: "Norin" },
      { id: "pop", name: "Pop" },
      { id: "torakorgan", name: "To'raqo'rg'on" },
      { id: "uychi", name: "Uychi" },
      { id: "yangiyo'l-nm", name: "Yangiyo'l" },
    ],
  },
  {
    id: "samarqand",
    name: "Samarqand viloyati",
    districts: [
      { id: "bulungur", name: "Bulung'ur" },
      { id: "ishtixon", name: "Ishtixon" },
      { id: "jomboy", name: "Jomboy" },
      { id: "kattaqorgon", name: "Kattaqo'rg'on" },
      { id: "narpay", name: "Narpay" },
      { id: "pastdargom", name: "Pastdarg'om" },
      { id: "payariq", name: "Payariq" },
      { id: "qoshrabot", name: "Qo'shrabot" },
      { id: "samarqand-shahar", name: "Samarqand shahri" },
      { id: "tayloq", name: "Toyloq" },
      { id: "urgut", name: "Urgut" },
    ],
  },
  {
    id: "buxoro",
    name: "Buxoro viloyati",
    districts: [
      { id: "buxoro-shahar", name: "Buxoro shahri" },
      { id: "gijduvon", name: "G'ijduvon" },
      { id: "jondor", name: "Jondor" },
      { id: "kogon", name: "Kogon" },
      { id: "olot", name: "Olot" },
      { id: "peshku", name: "Peshku" },
      { id: "qorakol", name: "Qorakol" },
      { id: "romitan", name: "Romitan" },
      { id: "shofirkon", name: "Shofirkon" },
      { id: "vobkent", name: "Vobkent" },
    ],
  },
  {
    id: "navoiy",
    name: "Navoiy viloyati",
    districts: [
      { id: "karmana", name: "Karmana" },
      { id: "navbahor", name: "Navbahor" },
      { id: "navoiy-shahar", name: "Navoiy shahri" },
      { id: "nurota", name: "Nurota" },
      { id: "qiziltepa", name: "Qiziltepa" },
      { id: "tomdi", name: "Tomdi" },
      { id: "uchquduq", name: "Uchquduq" },
      { id: "xatirchi", name: "Xatirchi" },
      { id: "zarafshon", name: "Zarafshon" },
    ],
  },
  {
    id: "qashqadaryo",
    name: "Qashqadaryo viloyati",
    districts: [
      { id: "chiroqchi", name: "Chiroqchi" },
      { id: "dehqonobod", name: "Dehqonobod" },
      { id: "guzor", name: "G'uzor" },
      { id: "kasbi", name: "Kasbi" },
      { id: "kitob", name: "Kitob" },
      { id: "koson", name: "Koson" },
      { id: "muborak", name: "Muborak" },
      { id: "nishon", name: "Nishon" },
      { id: "qamashi", name: "Qamashi" },
      { id: "qarshi-shahar", name: "Qarshi shahri" },
      { id: "shahrisabz", name: "Shahrisabz" },
      { id: "yakkabog", name: "Yakkabog'" },
    ],
  },
  {
    id: "surxondaryo",
    name: "Surxondaryo viloyati",
    districts: [
      { id: "angor", name: "Angor" },
      { id: "boysun", name: "Boysun" },
      { id: "denov", name: "Denov" },
      { id: "jarqorgon", name: "Jarqo'rg'on" },
      { id: "kumkurgan", name: "Kumkurgan" },
      { id: "oltinsoy", name: "Oltinsoy" },
      { id: "sariosiyo", name: "Sariosiyo" },
      { id: "sherobod", name: "Sherobod" },
      { id: "shorchi", name: "Sho'rchi" },
      { id: "termiz-shahar", name: "Termiz shahri" },
      { id: "uzun", name: "Uzun" },
    ],
  },
  {
    id: "jizzax",
    name: "Jizzax viloyati",
    districts: [
      { id: "arnasoy", name: "Arnasoy" },
      { id: "baxmal", name: "Baxmal" },
      { id: "dostlik", name: "Do'stlik" },
      { id: "forish", name: "Forish" },
      { id: "gallaorol", name: "G'allaorol" },
      { id: "jizzax-shahar", name: "Jizzax shahri" },
      { id: "mirzacho'l", name: "Mirzacho'l" },
      { id: "paxtakor", name: "Paxtakor" },
      { id: "yangiobod", name: "Yangiobod" },
      { id: "zafarobod", name: "Zafarobod" },
      { id: "zarbdor", name: "Zarbdor" },
      { id: "zomin", name: "Zomin" },
    ],
  },
  {
    id: "sirdaryo",
    name: "Sirdaryo viloyati",
    districts: [
      { id: "boyovut", name: "Boyovut" },
      { id: "guliston-shahar", name: "Guliston shahri" },
      { id: "mirzaobod", name: "Mirzaobod" },
      { id: "oqoltin", name: "Oqoltin" },
      { id: "sardoba", name: "Sardoba" },
      { id: "sayxunobod", name: "Sayxunobod" },
      { id: "sirdaryo", name: "Sirdaryo" },
      { id: "xovos", name: "Xovos" },
      { id: "yangiyer", name: "Yangiyer" },
    ],
  },
  {
    id: "xorazm",
    name: "Xorazm viloyati",
    districts: [
      { id: "bogot", name: "Bog'ot" },
      { id: "gurlan", name: "Gurlan" },
      { id: "hazorasp", name: "Hazorasp" },
      { id: "xiva-shahar", name: "Xiva shahri" },
      { id: "kohnurgench", name: "Ko'hna Urgench" },
      { id: "qoshkopir", name: "Qo'shko'pir" },
      { id: "shovot", name: "Shovot" },
      { id: "urgench-shahar", name: "Urgench shahri" },
      { id: "yangiariq", name: "Yangiariq" },
      { id: "yangibozor", name: "Yangibozor" },
    ],
  },
  {
    id: "qoraqalpogiston",
    name: "Qoraqalpog'iston Respublikasi",
    districts: [
      { id: "amudaryo", name: "Amudaryo" },
      { id: "beruniy", name: "Beruniy" },
      { id: "chimboy", name: "Chimboy" },
      { id: "ellikkala", name: "Ellikkala" },
      { id: "kegeyli", name: "Kegeyli" },
      { id: "moynoq", name: "Mo'ynoq" },
      { id: "nukus-shahar", name: "Nukus shahri" },
      { id: "qongrot", name: "Qo'ng'irot" },
      { id: "shumanay", name: "Shumanay" },
      { id: "taxtakopir", name: "Taxtako'pir" },
      { id: "tortko'l", name: "To'rtko'l" },
      { id: "xojayli", name: "Xo'jayli" },
    ],
  },
];

export function getRegionById(id: string): Region | undefined {
  return REGIONS.find(r => r.id === id);
}

export function getRegionByName(name: string): Region | undefined {
  return REGIONS.find(r => r.name === name);
}

export function getDistrictsByRegion(regionId: string): District[] {
  return REGIONS.find(r => r.id === regionId)?.districts || [];
}
