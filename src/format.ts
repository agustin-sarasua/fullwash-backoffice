/** Display formatting. Uruguayan locale and currency throughout. */

const LOCALE = 'es-UY';

export function formatTokens(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'ficha' : 'fichas'}`;
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "hace 3 días" / "nunca" -- the fastest way to read a client list for recency. */
export function formatRelative(iso: string | null | undefined, never = 'Nunca'): string {
  if (!iso) return never;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return never;

  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 0) return formatDate(iso);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 30) return `Hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Hace ${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(days / 365);
  return `Hace ${years} ${years === 1 ? 'año' : 'años'}`;
}

/** Current month as YYYY-MM in Montevideo, matching what the API defaults to. */
export function currentPeriod(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montevideo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

/** The N most recent months, newest first, for a period picker. */
export function recentPeriods(count = 12): string[] {
  const [yearStr, monthStr] = currentPeriod().split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return out;
}

export function periodLabel(period: string): string {
  const [year, month] = period.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(date);
}
