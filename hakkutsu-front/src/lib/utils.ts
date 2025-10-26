/**
 * 誕生日から年齢を計算する
 * @param birthDate - ISO形式の誕生日 (YYYY-MM-DD)
 * @returns 年齢（歳）。誕生日が無効な場合は null
 */
export function calculateAge(birthDate: string | undefined | null): number | null {
  if (!birthDate) return null;

  try {
    const birth = new Date(birthDate);
    const today = new Date();

    if (isNaN(birth.getTime())) return null;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // まだ誕生日が来ていない場合は年齢を1減らす
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * 2つの誕生日から年齢差を計算する
 * @param birthDate1 - ISO形式の誕生日1
 * @param birthDate2 - ISO形式の誕生日2
 * @returns 年齢差（絶対値）。どちらかが無効な場合は null
 */
export function calculateAgeDifference(
  birthDate1: string | undefined | null,
  birthDate2: string | undefined | null
): number | null {
  const age1 = calculateAge(birthDate1);
  const age2 = calculateAge(birthDate2);

  if (age1 === null || age2 === null) return null;

  return Math.abs(age1 - age2);
}
