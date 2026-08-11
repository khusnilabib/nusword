/**
 * Relative-time formatting for the dashboard document list.
 * Uses the Intl API with the Indonesian locale (PRD §27: Indonesian UI first).
 */
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/** "2 jam yang lalu", "kemarin", etc. */
export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: idLocale });
  } catch {
    return "";
  }
}

/** Compact absolute date for tooltips: "10 Agu 2026, 14:30". */
export function absoluteDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}
