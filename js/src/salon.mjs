// An invented sample salon in Doha. Names, prices, staff and hours are made up for the demo.
export const SALON = {
  name: { en: 'Sample Salon, West Bay', ar: 'صالون تجريبي، الخليج الغربي' },
  currency: { en: 'QAR', ar: 'ر.ق' },
  // Day 0 = Sunday ... 6 = Saturday. Qatar's weekend is Friday and Saturday; this salon opens late on Friday.
  hours: { 0: [600, 1320], 1: [600, 1320], 2: [600, 1320], 3: [600, 1320], 4: [600, 1320], 5: [840, 1320], 6: [600, 1320] },
  address: { en: 'West Bay, Doha (sample address)', ar: 'الخليج الغربي، الدوحة (عنوان تجريبي)' },
  map: 'https://maps.google.com/?q=West+Bay+Doha',
  policies: { en: 'Ladies only. Card or cash. Please give 4 hours’ notice to change a booking.', ar: 'للسيدات فقط. الدفع بالبطاقة أو نقدًا. لتغيير الموعد نرجو إبلاغنا قبل 4 ساعات.' },
  services: [
    { id: 'haircut', en: 'Haircut and blow-dry', ar: 'قص وسشوار', price: 150, from: false, minutes: 60,
      words: ['haircut', 'hair cut', 'trim', 'cut my hair', 'قص', 'قصه', 'قص شعر', 'تشذيب', 'اقص'] },
    { id: 'blowdry', en: 'Blow-dry', ar: 'سشوار', price: 120, from: false, minutes: 45,
      words: ['blow dry', 'blowdry', 'blow-dry', 'blowout', 'سشوار', 'استشوار', 'سشوار'] },
    { id: 'colour', en: 'Hair colour', ar: 'صبغة', price: 350, from: true, minutes: 120,
      words: ['colour', 'color', 'dye', 'highlights', 'balayage', 'صبغه', 'صبغ', 'هايلايت', 'بالياج', 'اصبغ'] },
    { id: 'keratin', en: 'Keratin treatment', ar: 'كيراتين', price: 800, from: true, minutes: 180,
      words: ['keratin', 'protein treatment', 'كيراتين', 'بروتين'] },
    { id: 'manicure', en: 'Manicure', ar: 'مناكير', price: 90, from: false, minutes: 45,
      words: ['manicure', 'mani', 'مناكير', 'منكير', 'مانيكير'] },
    { id: 'pedicure', en: 'Pedicure', ar: 'بديكير', price: 120, from: false, minutes: 60,
      words: ['pedicure', 'pedi', 'بديكير', 'باديكير', 'بيدكير', 'بدكير'] },
    { id: 'gel', en: 'Gel nails', ar: 'أظافر جل', price: 180, from: false, minutes: 75,
      words: ['gel nails', 'gel', 'nail extension', 'acrylic', 'جل', 'جيل', 'اظافر', 'تركيب اظافر'] },
    { id: 'henna', en: 'Henna', ar: 'حناء', price: 150, from: false, minutes: 60,
      words: ['henna', 'mehndi', 'حناء', 'حنا', 'حنه'] },
    { id: 'threading', en: 'Eyebrow threading', ar: 'حواجب بالخيط', price: 40, from: false, minutes: 15,
      words: ['threading', 'eyebrow', 'eyebrows', 'brows', 'حواجب', 'حاجب', 'خيط'] },
    { id: 'facial', en: 'Facial', ar: 'تنظيف بشرة', price: 250, from: false, minutes: 60,
      words: ['facial', 'face clean', 'skin cleaning', 'تنظيف بشره', 'بشره', 'فيشل'] },
  ],
  staff: [
    { id: 'st1', name: 'Stylist A', skills: ['haircut', 'blowdry', 'colour', 'keratin'] },
    { id: 'st2', name: 'Stylist B', skills: ['haircut', 'blowdry', 'colour', 'henna', 'threading'] },
    { id: 'st3', name: 'Nail and skin therapist', skills: ['manicure', 'pedicure', 'gel', 'threading', 'facial'] },
  ],
};
export function serviceById(id) { return SALON.services.find(s => s.id === id) ?? null; }
