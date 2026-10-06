const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeekWindow = {
  weekId: string;
  validFrom: Date;
  validUntil: Date;
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export function getOdaiWeekWindow(now = new Date()): WeekWindow {
  const tokyoDate = new Date(now.getTime() + JST_OFFSET_MS);
  const day = tokyoDate.getUTCDay();
  let daysSinceMonday = (day + 6) % 7;
  if (daysSinceMonday === 0 && tokyoDate.getUTCHours() < 8) daysSinceMonday = 7;

  const monday = new Date(
    Date.UTC(
      tokyoDate.getUTCFullYear(),
      tokyoDate.getUTCMonth(),
      tokyoDate.getUTCDate() - daysSinceMonday,
    ),
  );
  const weekId = `${monday.getUTCFullYear()}-${pad2(monday.getUTCMonth() + 1)}-${pad2(monday.getUTCDate())}`;
  const validFrom = new Date(`${weekId}T08:00:00+09:00`);
  return { weekId, validFrom, validUntil: new Date(validFrom.getTime() + WEEK_MS) };
}
