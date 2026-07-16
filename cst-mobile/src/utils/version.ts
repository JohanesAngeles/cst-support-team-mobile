// Compares dot-separated numeric version strings, e.g. isVersionAtLeast('1.2.0', '1.10.0') === false.
export function isVersionAtLeast(current: string, min: string): boolean {
  const a = current.split('.').map(n => parseInt(n, 10) || 0);
  const b = min.split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }
  return true;
}
