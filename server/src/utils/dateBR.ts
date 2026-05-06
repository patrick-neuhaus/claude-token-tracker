/**
 * Timezone-aware date helpers for America/Sao_Paulo.
 *
 * Postgres runs in UTC and SQL queries already use `AT TIME ZONE 'America/Sao_Paulo'`
 * for date_trunc/extract. The bug was in the Node layer: `new Date()` + `setHours(0,0,0,0)`
 * computed midnight in the *container* TZ (UTC), so "today" / "this month" filters
 * were 3h off (entries 21h-23h59 BR fell into the wrong day).
 *
 * These helpers compute presets using the *user's* timezone (hardcoded BR for now;
 * Wave 8+ will read from `users.timezone` column for multi-tenant SaaS).
 */
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { startOfDay, startOfMonth, subDays } from "date-fns";

export const USER_TZ = "America/Sao_Paulo";

/** Current instant; identical to `new Date()` but kept here for symmetry. */
export function nowUTC(): Date {
  return new Date();
}

/** Returns ISO UTC string for "midnight TODAY in BR wall clock". */
export function startOfTodayBR(): string {
  const brNow = toZonedTime(new Date(), USER_TZ);
  const brMidnight = startOfDay(brNow);
  return fromZonedTime(brMidnight, USER_TZ).toISOString();
}

/** Returns ISO UTC string for "first day of CURRENT MONTH at midnight BR". */
export function startOfMonthBR(): string {
  const brNow = toZonedTime(new Date(), USER_TZ);
  const brStart = startOfMonth(brNow);
  return fromZonedTime(brStart, USER_TZ).toISOString();
}

/**
 * Returns ISO UTC string for "midnight N days ago in BR".
 *
 * For "7d", "30d" presets the user expects 7 full days back from today's
 * midnight, not "7 * 24h from now". subDays + startOfDay in BR honors this.
 */
export function startOfNDaysAgoBR(days: number): string {
  const brNow = toZonedTime(new Date(), USER_TZ);
  const brTarget = startOfDay(subDays(brNow, days));
  return fromZonedTime(brTarget, USER_TZ).toISOString();
}
