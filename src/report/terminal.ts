import chalk from "chalk";
import boxen from "boxen";
import Table from "cli-table3";
import dayjs from "dayjs";
import type { Report } from "./builder.ts";
import type { StandupConfig } from "../config/defaults.ts";
import { formatCommitMessage } from "../utils/emoji.ts";

/**
 * Render a report as beautiful terminal output.
 */
export function renderTerminal(report: Report, config: StandupConfig): string {
  const lines: string[] = [];
  const useColor = true; // Will be toggled via --no-color externally

  const dateStr = dayjs(report.date).format("dddd, MMM D YYYY");

  // Header box
  const header = boxen(
    chalk.bold.cyan(`\uD83E\uDDD1\u200D\uD83D\uDCBB  STANDUP  \u2014  ${dateStr}`),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: "cyan",
      borderStyle: "round",
    },
  );
  lines.push(header);
  lines.push("");

  if (report.repos.length === 0) {
    lines.push(chalk.yellow("  No commits found for this period."));
    lines.push("");
    return lines.join("\n");
  }

  for (const repo of report.repos) {
    if (repo.error) {
      lines.push(chalk.red(`  \u274C ${repo.name}: ${repo.error}`));
      lines.push("");
      continue;
    }

    if (repo.commits.length === 0) continue;

    // Repo header
    lines.push(
      chalk.bold(`\uD83D\uDCC1 ${repo.name}`) +
        chalk.gray(`  (${repo.branch})`),
    );
    lines.push("");

    // Build table
    const headRow: string[] = ["Commit"];
    if (config.display.show_branch) headRow.push("Branch");
    if (config.display.show_hash) headRow.push("Hash");
    headRow.push("Time");

    const colWidths: number[] = [40];
    if (config.display.show_branch) colWidths.push(14);
    if (config.display.show_hash) colWidths.push(10);
    colWidths.push(8);

    const table = new Table({
      head: headRow.map((h) => chalk.bold.white(h)),
      colWidths,
      style: {
        head: [],
        border: [],
        "padding-left": 1,
        "padding-right": 1,
      },
      chars: {
        top: "\u2500",
        "top-mid": "\u252C",
        "top-left": "\u250C",
        "top-right": "\u2510",
        bottom: "\u2500",
        "bottom-mid": "\u2534",
        "bottom-left": "\u2514",
        "bottom-right": "\u2518",
        left: "\u2502",
        "left-mid": "\u251C",
        mid: "\u2500",
        "mid-mid": "\u253C",
        right: "\u2502",
        "right-mid": "\u2524",
        middle: "\u2502",
      },
    });

    for (const commit of repo.commits) {
      const msg = formatCommitMessage(commit.message, config.display.emoji);

      const row: string[] = [msg];
      if (config.display.show_branch) row.push(chalk.blue(commit.branch));
      if (config.display.show_hash) row.push(chalk.gray(commit.shortHash));
      row.push(chalk.gray(dayjs(commit.date).format("HH:mm")));

      table.push(row);
    }

    // Indent the table
    const tableStr = table
      .toString()
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n");
    lines.push(tableStr);
    lines.push("");
  }

  // Summary line
  const repoCount = report.repos.filter((r) => r.commits.length > 0).length;
  const summary = chalk.gray(
    `  ${report.totalCommits} commit${report.totalCommits !== 1 ? "s" : ""} across ${repoCount} repo${repoCount !== 1 ? "s" : ""}  \u00B7  ${report.range.label}`,
  );
  lines.push(summary);
  lines.push("");

  return lines.join("\n");
}

/**
 * Render report as plain text (no ANSI codes) for piping.
 */
export function renderPlain(report: Report, config: StandupConfig): string {
  const lines: string[] = [];

  const dateStr = dayjs(report.date).format("dddd, MMM D YYYY");
  lines.push(`STANDUP \u2014 ${dateStr}`);
  lines.push("=".repeat(40));
  lines.push("");

  for (const repo of report.repos) {
    if (repo.error) {
      lines.push(`[ERROR] ${repo.name}: ${repo.error}`);
      lines.push("");
      continue;
    }

    if (repo.commits.length === 0) continue;

    lines.push(`${repo.name} (${repo.branch})`);
    lines.push("-".repeat(30));

    for (const commit of repo.commits) {
      const msg = formatCommitMessage(commit.message, config.display.emoji);
      const time = dayjs(commit.date).format("HH:mm");
      const parts = [msg];
      if (config.display.show_branch) parts.push(`[${commit.branch}]`);
      if (config.display.show_hash) parts.push(commit.shortHash);
      parts.push(time);
      lines.push(`  ${parts.join("  ")}`);
    }

    lines.push("");
  }

  const repoCount = report.repos.filter((r) => r.commits.length > 0).length;
  lines.push(
    `${report.totalCommits} commit${report.totalCommits !== 1 ? "s" : ""} across ${repoCount} repo${repoCount !== 1 ? "s" : ""}  |  ${report.range.label}`,
  );

  return lines.join("\n");
}
