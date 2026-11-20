// Arabic text the way customers type it: with or without hamza, taa marbuta, diacritics, tatweel, Arabic-Indic digits.
// Everything is matched after this, so "بكرة", "بكره" and "بُكرة" are the same word.
const DIGITS = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
export function westernDigits(s) { return String(s ?? '').replace(/[٠-٩۰-۹]/g, d => DIGITS[d]); }

export function normalizeText(s) {
  return westernDigits(s)
    .replace(/[ً-ْٰ]/g, '')        // diacritics (tashkeel)
    .replace(/ـ/g, '')                       // tatweel
    .replace(/[أإآٱ]/g, 'ا') // alef forms -> bare alef
    .replace(/ى/g, 'ي')                 // alef maqsura -> yaa
    .replace(/ة/g, 'ه')                 // taa marbuta -> haa
    .replace(/ؤ/g, 'و')                 // waw with hamza -> waw
    .replace(/ئ/g, 'ي')                 // yaa with hamza -> yaa
    .replace(/چ/g, 'ج')                 // Gulf "ch" (چ) -> jeem, so باچر = باجر
    .replace(/ک/g, 'ك').replace(/ی/g, 'ي') // Persian kaf / yeh keyboards
    .toLowerCase()
    .replace(/[؟،؛?!.,;:()"'«»“”‘’*_~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
// The same matching without normalization, for measuring what normalization buys.
export function plainText(s) { return String(s ?? '').toLowerCase().replace(/[?!.,;:()]/g, ' ').replace(/\s+/g, ' ').trim(); }
