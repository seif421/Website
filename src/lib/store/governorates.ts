// Egypt's 27 governorates in Arabic. The English name is what the database stores and the delivery fees use.
const AR: Record<string, string> = {
  Alexandria: "الإسكندرية",
  Assiut: "أسيوط",
  Aswan: "أسوان",
  Beheira: "البحيرة",
  "Beni Suef": "بني سويف",
  Cairo: "القاهرة",
  Dakahlia: "الدقهلية",
  Damietta: "دمياط",
  Fayoum: "الفيوم",
  Gharbia: "الغربية",
  Giza: "الجيزة",
  Ismailia: "الإسماعيلية",
  "Kafr El Sheikh": "كفر الشيخ",
  Luxor: "الأقصر",
  Matrouh: "مطروح",
  Menoufia: "المنوفية",
  Minya: "المنيا",
  "New Valley": "الوادي الجديد",
  "North Sinai": "شمال سيناء",
  "Port Said": "بورسعيد",
  Qalyubia: "القليوبية",
  Qena: "قنا",
  "Red Sea": "البحر الأحمر",
  Sharqia: "الشرقية",
  Sohag: "سوهاج",
  "South Sinai": "جنوب سيناء",
  Suez: "السويس",
};

/** "Cairo — القاهرة": both languages, always, for pickers. */
export function governorateLabel(name: string): string {
  const ar = AR[name];
  return ar ? `${name} — ${ar}` : name;
}
