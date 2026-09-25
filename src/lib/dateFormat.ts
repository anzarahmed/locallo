const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DISPLAY_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// `new Date('YYYY-MM-DD')` parses as UTC midnight, which renders as the previous
// day in timezones west of UTC — date-only strings must be parsed as local dates.
export function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (DATE_ONLY_RE.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatTime(value: string | Date): string {
  const d = toDate(value);
  const hours = d.getHours() % 12 || 12;
  return `${pad(hours)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${formatTime(d)}`;
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToDisplayDate(iso: string): string {
  return DATE_ONLY_RE.test(iso) ? formatDate(iso) : '';
}

export function parseDisplayDate(text: string): string | null {
  const match = DISPLAY_DATE_RE.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toIsoDate(d);
}
