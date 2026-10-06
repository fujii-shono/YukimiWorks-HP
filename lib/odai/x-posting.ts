export type WeeklyOdaiXPostingMode = 'enabled' | 'dry-run' | 'disabled';

export function getWeeklyOdaiXPostingMode(
  environment: Readonly<Record<string, string | undefined>>,
): WeeklyOdaiXPostingMode {
  if (environment.VERCEL_ENV !== 'production') return 'disabled';
  if (environment.X_WEEKLY_ODAI_ENABLED !== 'true') return 'disabled';
  if (environment.X_POST_DRY_RUN === 'true') return 'dry-run';
  return 'enabled';
}
