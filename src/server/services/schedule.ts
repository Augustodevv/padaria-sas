/**
 * Horários de retirada/entrega. Funções puras.
 * O Brasil não tem horário de verão desde 2019, então São Paulo é tratada como UTC-3 fixo.
 */
export const SP_OFFSET_HOURS = 3;
export const SLOT_MINUTES = 30;
export const MIN_LEAD_MINUTES = 120;
export const MAX_DAYS_AHEAD = 7;

export interface OpeningHours {
  weekdays: string;
  saturday: string;
  sunday: string;
}

export const DEFAULT_HOURS: OpeningHours = {
  weekdays: "07:00–19:00",
  saturday: "07:00–17:00",
  sunday: "08:00–13:00",
};

function parseRange(range: string): [number, number] | null {
  const m = range.match(/^(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})$/);
  if (!m) return null;
  return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

/** Data/hora "de parede" em São Paulo para um instante UTC. */
function spParts(d: Date) {
  const shifted = new Date(d.getTime() - SP_OFFSET_HOURS * 3_600_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(), // 0 = domingo
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function hoursFor(weekday: number, hours: OpeningHours): [number, number] | null {
  const raw = weekday === 0 ? hours.sunday : weekday === 6 ? hours.saturday : hours.weekdays;
  return parseRange(raw);
}

function instant(year: number, month: number, day: number, minutes: number): Date {
  return new Date(Date.UTC(year, month, day, 0, 0) + (minutes + SP_OFFSET_HOURS * 60) * 60_000);
}

/** Lista de horários disponíveis (UTC) a partir de `now`. */
export function availableSlots(now: Date, hours: OpeningHours = DEFAULT_HOURS): Date[] {
  const earliest = now.getTime() + MIN_LEAD_MINUTES * 60_000;
  const today = spParts(now);
  const slots: Date[] = [];

  for (let i = 0; i <= MAX_DAYS_AHEAD; i++) {
    const base = new Date(Date.UTC(today.year, today.month, today.day + i));
    const weekday = base.getUTCDay();
    const range = hoursFor(weekday, hours);
    if (!range) continue;
    const [open, close] = range;
    // último horário precisa terminar até o fechamento
    for (let m = open; m + SLOT_MINUTES <= close; m += SLOT_MINUTES) {
      const at = instant(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), m);
      if (at.getTime() >= earliest) slots.push(at);
    }
  }
  return slots;
}

export function isValidSlot(candidate: Date, now: Date, hours: OpeningHours = DEFAULT_HOURS): boolean {
  if (Number.isNaN(candidate.getTime())) return false;
  return availableSlots(now, hours).some((s) => s.getTime() === candidate.getTime());
}

export function formatSlot(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
