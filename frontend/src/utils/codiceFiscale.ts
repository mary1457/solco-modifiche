const ODD: Record<string, number> = {
  "0":1,"1":0,"2":5,"3":7,"4":9,"5":13,"6":15,"7":17,"8":19,"9":21,
  "A":1,"B":0,"C":5,"D":7,"E":9,"F":13,"G":15,"H":17,"I":19,"J":21,
  "K":2,"L":4,"M":18,"N":20,"O":11,"P":3,"Q":6,"R":8,"S":12,"T":14,
  "U":16,"V":10,"W":22,"X":25,"Y":24,"Z":23,
};

const MONTH_LETTER: Record<string, number> = {
  A:1, B:2, C:3, D:4, E:5, H:6, L:7, M:8, P:9, R:10, S:11, T:12,
};

export function validateCFCheckDigit(cf: string): boolean {
  const s = cf.toUpperCase();
  if (s.length !== 16) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const c = s[i];
    if (i % 2 === 0) {
      sum += ODD[c] ?? 0;
    } else {
      const code = c.charCodeAt(0);
      sum += code >= 65 ? code - 65 : code - 48;
    }
  }
  return s[15] === String.fromCharCode(65 + (sum % 26));
}

// birthDate must be in DD/MM/YYYY format
export function validateCFBirthDate(cf: string, birthDate: string): boolean {
  const s = cf.toUpperCase();
  if (s.length < 11) return false;
  const parts = birthDate.split("/");
  if (parts.length !== 3) return false;
  const day   = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year  = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return false;

  const cfYear  = parseInt(s.substring(6, 8), 10);
  const cfMonth = MONTH_LETTER[s[8]];
  const cfDayRaw = parseInt(s.substring(9, 11), 10);
  const cfDay   = cfDayRaw > 40 ? cfDayRaw - 40 : cfDayRaw;

  return cfYear === year % 100 && cfMonth === month && cfDay === day;
}
