// Uzbek suffixes to strip for root/stem matching
const UZBEK_SUFFIXES = [
  'larimizga', 'larimizda', 'larimizdan', 'larimizni', 'larimiz',
  'lariga', 'larida', 'laridan', 'larini', 'laringiz', 'laring', 'lari',
  'dagi', 'boyicha', 'haqida',
  'mizga', 'mizda', 'mizdan', 'mizni', 'miz',
  'ingizga', 'ingizda', 'ingizdan', 'ingizni', 'ingiz',
  'alar', 'lar', 'ning', 'dan', 'gan', 'kan', 'qan',
  'ga', 'ka', 'qa', 'da', 'ni', 'mi'
];

export function stemUzbekWord(word: string): string {
  let stem = word.toLowerCase();
  if (stem.length <= 3) return stem;

  for (const suf of UZBEK_SUFFIXES) {
    if (stem.endsWith(suf) && stem.length - suf.length >= 3) {
      stem = stem.slice(0, -suf.length);
      break;
    }
  }
  // Common conversational variants & typos
  if (stem.startsWith('kursa')) stem = 'kurs';
  if (stem.startsWith('berin')) stem = 'ber';
  if (stem.startsWith('aytin')) stem = 'ayt';
  return stem;
}

export function normalizeUzbekText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/['‘’`]/g, '')
    .replace(/sh/g, 's')
    .replace(/ch/g, 'c')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTrigrams(str: string): Set<string> {
  const trigrams = new Set<string>();
  const padded = `  ${str}  `;
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.slice(i, i + 3));
  }
  return trigrams;
}

export function calculateTrigramSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeUzbekText(str1);
  const norm2 = normalizeUzbekText(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const tri1 = getTrigrams(norm1);
  const tri2 = getTrigrams(norm2);

  let intersection = 0;
  tri1.forEach((t) => {
    if (tri2.has(t)) intersection++;
  });

  return (2 * intersection) / (tri1.size + tri2.size);
}

// Stop words and conversational fillers
const STOP_WORDS = new Set([
  'menga', 'bizga', 'sizlarga', 'sizlarda', 'sizlar', 'sizga', 'bormi', 'kerak',
  'mumkinmi', 'aytingchi', 'iltimos', 'qanday', 'qaysi', 'haqida', 'boyicha',
  'uchun', 'bilan', 'yoki', 'va', 'ham', 'edim', 'deb', 'edi', 'ber', 'bering',
  'ayt', 'ayting', 'aytib', 'olish', 'olmoqchiman'
]);

function isContentWord(raw: string, stem: string): boolean {
  return !STOP_WORDS.has(raw) && !STOP_WORDS.has(stem) && stem.length >= 3;
}

export function calculateTokenSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeUzbekText(str1);
  const norm2 = normalizeUzbekText(str2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const raw1 = norm1.split(' ').filter(Boolean);
  const raw2 = norm2.split(' ').filter(Boolean);

  const stems1 = raw1.map(stemUzbekWord);
  const stems2 = raw2.map(stemUzbekWord);

  const content1 = stems1.filter((s, i) => isContentWord(raw1[i], s));
  const content2 = stems2.filter((s, i) => isContentWord(raw2[i], s));

  // If content words exist on both sides, compare content words
  const wordsToCompare1 = content1.length > 0 ? content1 : stems1;
  const wordsToCompare2 = content2.length > 0 ? content2 : stems2;

  let matched = 0;
  for (const w1 of wordsToCompare1) {
    const isMatch = wordsToCompare2.some((w2) => {
      if (w1 === w2) return true;
      if (w1.length >= 4 && w2.length >= 4) {
        if (w1.startsWith(w2.slice(0, 4)) || w2.startsWith(w1.slice(0, 4))) return true;
      }
      return false;
    });
    if (isMatch) matched++;
  }

  const recall = matched / wordsToCompare1.length;
  const precision = matched / wordsToCompare2.length;
  const f1 = (2 * precision * recall) / (precision + recall || 1);

  if (recall >= 1.0 && precision >= 0.6) {
    return Math.max(0.92, f1);
  }

  return f1;
}

export function calculateSimilarity(userQuery: string, candidateQuery: string): number {
  const normUser = normalizeUzbekText(userQuery);
  const normCandidate = normalizeUzbekText(candidateQuery);

  if (!normUser || !normCandidate) return 0;
  if (normUser === normCandidate) return 1.0;

  const userWords = normUser.split(' ').filter(Boolean);
  const candWords = normCandidate.split(' ').filter(Boolean);

  if (userWords.length === 1 && candWords.length === 1) {
    const s1 = stemUzbekWord(userWords[0]);
    const s2 = stemUzbekWord(candWords[0]);
    if (s1 === s2) return 1.0;
    return calculateTrigramSimilarity(normUser, normCandidate);
  }

  const trigram = calculateTrigramSimilarity(userQuery, candidateQuery);
  const token = calculateTokenSimilarity(userQuery, candidateQuery);

  return Math.max(token, trigram * 0.3 + token * 0.7);
}
