import dayjs from "dayjs";

export interface DateRange {
  since: Date;
  until: Date;
  label: string;
}

/**
 * Get the start of yesterday and end of yesterday.
 */
export function yesterday(): DateRange {
  const d = dayjs().subtract(1, "day");
  return {
    since: d.startOf("day").toDate(),
    until: d.endOf("day").toDate(),
    label: "Yesterday",
  };
}

/**
 * Get the start and end of today.
 */
export function today(): DateRange {
  const d = dayjs();
  return {
    since: d.startOf("day").toDate(),
    until: d.endOf("day").toDate(),
    label: "Today",
  };
}

/**
 * Get the start of the current week (Monday) to now.
 */
export function thisWeek(): DateRange {
  const now = dayjs();
  // dayjs startOf("week") uses Sunday by default; shift to Monday
  const start = now.startOf("week").add(1, "day");
  return {
    since: start.toDate(),
    until: now.endOf("day").toDate(),
    label: "This Week",
  };
}

/**
 * Parse a human-friendly "since" string like "2 days ago", "last monday",
 * or an ISO date, into a DateRange ending at now.
 */
export function parseSince(sinceStr: string, untilStr?: string): DateRange {
  const since = dayjs(sinceStr).isValid()
    ? dayjs(sinceStr)
    : parseRelative(sinceStr);

  const until = untilStr
    ? dayjs(untilStr).isValid()
      ? dayjs(untilStr).endOf("day")
      : parseRelative(untilStr).endOf("day")
    : dayjs().endOf("day");

  return {
    since: since.startOf("day").toDate(),
    until: until.toDate(),
    label: `${since.format("MMM D")} - ${until.format("MMM D")}`,
  };
}

/**
 * Very simple relative date parsing: "N days ago", "N weeks ago", etc.
 */
function parseRelative(str: string): dayjs.Dayjs {
  const match = str.match(/(\d+)\s*(day|week|month)s?\s*ago/i);
  if (match) {
    const amount = parseInt(match[1]!, 10);
    const unit = match[2]!.toLowerCase() as "day" | "week" | "month";
    return dayjs().subtract(amount, unit);
  }
  // fallback: try parsing as-is; if invalid, default to yesterday
  const parsed = dayjs(str);
  return parsed.isValid() ? parsed : dayjs().subtract(1, "day");
}

/**
 * Resolve a DateRange from CLI flags.
 */
export function resolveRange(opts: {
  today?: boolean;
  yesterday?: boolean;
  since?: string;
  until?: string;
  week?: boolean;
  defaultRange?: string;
}): DateRange {
  if (opts.today) return today();
  if (opts.yesterday) return yesterday();
  if (opts.week) return thisWeek();
  if (opts.since) return parseSince(opts.since, opts.until);

  // Use config default
  switch (opts.defaultRange) {
    case "today":
      return today();
    case "week":
      return thisWeek();
    case "yesterday":
    default:
      return yesterday();
  }
}

/**
 * Format a date for git log --since / --until flags.
 */
export function toGitDate(d: Date): string {
  return dayjs(d).format("YYYY-MM-DD HH:mm:ss");
}

/**
 * Pretty format for report headers.
 */
export function formatReportDate(d: Date): string {
  return dayjs(d).format("dddd, MMM D YYYY");
}
