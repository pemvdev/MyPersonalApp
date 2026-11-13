import { randomUUID } from 'node:crypto';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export function occurrenceDates(
  start: Date,
  frequency: Frequency,
  interval: number,
  until: Date | null,
  through: Date,
) {
  const dates: Date[] = [];
  const startDay = start.getUTCDate();
  let index = 1;
  while (dates.length < 5000) {
    let next: Date;
    if (frequency === 'daily') {
      next = new Date(start);
      next.setUTCDate(start.getUTCDate() + index * interval);
    } else if (frequency === 'weekly') {
      next = new Date(start);
      next.setUTCDate(start.getUTCDate() + index * interval * 7);
    } else {
      const month = start.getUTCMonth() + index * interval;
      const year = start.getUTCFullYear() + Math.floor(month / 12);
      const monthIndex = month % 12;
      const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
      next = new Date(Date.UTC(year, monthIndex, Math.min(startDay, lastDay)));
    }
    if (next > through || (until && next > until)) break;
    dates.push(next);
    index += 1;
  }
  return dates;
}

export const recurrenceClientId = () => randomUUID();
