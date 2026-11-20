// Which language to answer in. Arabic script -> Arabic. Latin script with Gulf "Arabizi" (3 = ع, 7 = ح, ...) -> Arabic too.
import { normalizeText } from './normalize.mjs';

const ARABIZI_WORDS = new Set(['shlonk', 'shlonich', 'shlonech', 'kam', 'bkam', 'b kam', 'se3r', 'si3r', 's3r', 'asa3ar', 'as3ar', 'wain', 'wen', 'wainkom', 'mata', 'ab8a', 'abgha', 'abga', 'aby', 'abi', 'abee',
  'ba3d', 'b3d', 'bukra', 'bokra', 'bacher', 'bachir', 'baachir', 'inshallah', 'insha', 'hala', 'marhaba', 'mar7aba', '3ndkm', '3indkum', 'mumkin', 'momkin', 'mawa3eed', 'maw3ed', 'maw3id', '7ajz', '7jz', 'a7jz', 'a7joz',
  'salam', 'salaam', 'el', 'al', 'yalla', 'habibti', 'shukran', 'shokran', 'msh', 'mo', 'ma3', 'wayed', 'zain', 'zein', 'ya', 'akhti', 'ukhti', 'sabah', 'masa', 'el5air', 'alkhair', 'il7en', 'alhin', 'elhin', 'tftho', 'tftahon', 'tsakron', 'dawam']);
const DIGIT_LETTER = /^(?=.*[a-z])(?=.*[23456789])[a-z0-9']+$/; // words like 3ndkm, 7ajz, se3r

export function detectLanguage(text) {
  const s = String(text ?? '');
  const arabic = (s.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (s.match(/[A-Za-z]/g) ?? []).length;
  if (arabic >= 3 && arabic * 2 >= latin) return 'ar'; // a mostly-Arabic message with an English word or two
  if (!latin) return arabic ? 'ar' : 'en';
  const words = normalizeText(s).split(' ').filter(Boolean);
  const hits = words.filter(w => ARABIZI_WORDS.has(w) || (DIGIT_LETTER.test(w) && !/^\d+(am|pm)$/.test(w))).length;
  return hits >= 2 || (hits === 1 && words.length <= 3) ? 'ar' : 'en';
}
