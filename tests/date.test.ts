import { test, expect, describe } from "bun:test";
import { yesterday, today, thisWeek, parseSince, resolveRange, toGitDate, formatReportDate } from "../src/utils/date.ts";
import dayjs from "dayjs";

describe("date utils", () => {
  test("yesterday returns a range for yesterday", () => {
    const range = yesterday();
    const y = dayjs().subtract(1, "day");
    expect(range.label).toBe("Yesterday");
    expect(dayjs(range.since).format("YYYY-MM-DD")).toBe(y.format("YYYY-MM-DD"));
    expect(dayjs(range.until).format("YYYY-MM-DD")).toBe(y.format("YYYY-MM-DD"));
  });

  test("today returns a range for today", () => {
    const range = today();
    const t = dayjs();
    expect(range.label).toBe("Today");
    expect(dayjs(range.since).format("YYYY-MM-DD")).toBe(t.format("YYYY-MM-DD"));
    expect(dayjs(range.until).format("YYYY-MM-DD")).toBe(t.format("YYYY-MM-DD"));
  });

  test("thisWeek returns a range starting Monday", () => {
    const range = thisWeek();
    expect(range.label).toBe("This Week");
    // since should be <= today
    expect(range.since.getTime()).toBeLessThanOrEqual(range.until.getTime());
  });

  test("parseSince handles ISO date", () => {
    const range = parseSince("2025-01-01");
    expect(dayjs(range.since).format("YYYY-MM-DD")).toBe("2025-01-01");
  });

  test("parseSince handles relative date", () => {
    const range = parseSince("3 days ago");
    const expected = dayjs().subtract(3, "day").format("YYYY-MM-DD");
    expect(dayjs(range.since).format("YYYY-MM-DD")).toBe(expected);
  });

  test("resolveRange defaults to yesterday", () => {
    const range = resolveRange({});
    expect(range.label).toBe("Yesterday");
  });

  test("resolveRange respects --today flag", () => {
    const range = resolveRange({ today: true });
    expect(range.label).toBe("Today");
  });

  test("resolveRange respects --week flag", () => {
    const range = resolveRange({ week: true });
    expect(range.label).toBe("This Week");
  });

  test("resolveRange respects config default", () => {
    const range = resolveRange({ defaultRange: "today" });
    expect(range.label).toBe("Today");
  });

  test("toGitDate formats correctly", () => {
    const d = new Date("2025-06-15T10:30:00");
    const result = toGitDate(d);
    expect(result).toMatch(/2025-06-15/);
  });

  test("formatReportDate formats correctly", () => {
    const d = new Date("2025-01-10T00:00:00");
    const result = formatReportDate(d);
    expect(result).toContain("Jan");
    expect(result).toContain("2025");
  });
});
