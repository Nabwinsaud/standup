import chalk from "chalk";
import boxen from "boxen";
import dayjs from "dayjs";
import type { Report } from "./builder.ts";
import type { StandupConfig } from "../config/defaults.ts";
import type { AISummaryResult } from "../ai/summarize.ts";

/**
 * Render an AI-summarized report for the terminal.
 */
export function renderAITerminal(
  report: Report,
  summary: AISummaryResult,
  config: StandupConfig,
): string {
  const lines: string[] = [];

  const dateStr = dayjs(report.date).format("dddd, MMM D YYYY");

  // Header box
  const header = boxen(
    chalk.bold.cyan(`\uD83E\uDD16  AI STANDUP  \u2014  ${dateStr}`),
    {
      padding: { top: 0, bottom: 0, left: 1, right: 1 },
      borderColor: "magenta",
      borderStyle: "round",
    },
  );
  lines.push(header);
  lines.push("");

  if (report.totalCommits === 0) {
    lines.push(chalk.yellow("  No commits found for this period."));
    lines.push("");
    return lines.join("\n");
  }

  // Render the AI summary with terminal formatting
  const summaryLines = summary.summary.split("\n");
  for (const line of summaryLines) {
    if (line.startsWith("### ")) {
      // Section header
      lines.push("");
      lines.push(`  ${chalk.bold.magenta(line.replace("### ", ""))}`);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      lines.push(`  ${chalk.bold.white(line.replace(/\*\*/g, ""))}`);
    } else if (line.startsWith("- ")) {
      lines.push(`  ${chalk.white(line)}`);
    } else if (line.trim() === "") {
      lines.push("");
    } else {
      lines.push(`  ${chalk.white(line)}`);
    }
  }

  lines.push("");

  // Footer
  const repoNames = report.repos
    .filter((r) => r.commits.length > 0)
    .map((r) => r.name)
    .join(", ");

  const footer = chalk.gray(
    `  ${report.totalCommits} commit${report.totalCommits !== 1 ? "s" : ""} from ${repoNames}  \u00B7  ${report.range.label}  \u00B7  ${summary.model} (${summary.tokensUsed} tokens)`,
  );
  lines.push(footer);
  lines.push("");

  return lines.join("\n");
}

/**
 * Render an AI-summarized report as plain text (no ANSI).
 */
export function renderAIPlain(
  report: Report,
  summary: AISummaryResult,
): string {
  const lines: string[] = [];

  const dateStr = dayjs(report.date).format("dddd, MMM D YYYY");
  lines.push(`STANDUP REPORT \u2014 ${dateStr}`);
  lines.push("=".repeat(44));
  lines.push("");

  lines.push(summary.summary);
  lines.push("");

  const repoNames = report.repos
    .filter((r) => r.commits.length > 0)
    .map((r) => r.name)
    .join(", ");

  lines.push(
    `${report.totalCommits} commits from ${repoNames}  |  ${report.range.label}`,
  );

  return lines.join("\n");
}

/**
 * Render an AI-summarized report as a polished Markdown document.
 *
 * This is the file that gets exported for PMs / stakeholders.
 * It has a proper title, date, author, project list, the AI summary,
 * and a clean footer — ready to paste into Slack, Notion, or email.
 */
export function renderAIMarkdown(
  report: Report,
  summary: AISummaryResult,
): string {
  const lines: string[] = [];

  const dateStr = dayjs(report.date).format("dddd, MMMM D, YYYY");
  const shortDate = dayjs(report.date).format("YYYY-MM-DD");

  // Title
  lines.push(`# Standup Report \u2014 ${dateStr}`);
  lines.push("");

  // Metadata table
  const repoNames = report.repos
    .filter((r) => r.commits.length > 0)
    .map((r) => r.name);
  const repoCount = repoNames.length;

  lines.push("| | |");
  lines.push("|---|---|");
  if (report.author !== "all") {
    lines.push(`| **Author** | ${report.author} |`);
  }
  lines.push(`| **Date** | ${dateStr} |`);
  lines.push(`| **Period** | ${report.range.label} |`);
  lines.push(
    `| **Project${repoCount !== 1 ? "s" : ""}** | ${repoNames.join(", ")} |`,
  );
  lines.push(
    `| **Changes** | ${report.totalCommits} commit${report.totalCommits !== 1 ? "s" : ""} |`,
  );
  lines.push("");

  lines.push("---");
  lines.push("");

  // AI summary body — this comes pre-formatted from the LLM
  // with ### Completed, ### In Progress, ### Notes sections
  lines.push(summary.summary);
  lines.push("");

  lines.push("---");
  lines.push("");

  // Per-project commit breakdown (collapsed for PM — they can expand if needed)
  if (repoCount > 0) {
    lines.push("<details>");
    lines.push("<summary><strong>Detailed commit log</strong></summary>");
    lines.push("");

    for (const repo of report.repos) {
      if (repo.commits.length === 0) continue;

      lines.push(`#### ${repo.name}`);
      lines.push("");
      lines.push("| Time | Description |");
      lines.push("|------|-------------|");

      for (const commit of repo.commits) {
        const time = dayjs(commit.date).format("HH:mm");
        // Clean up the message for the table
        const msg = commit.message.replace(/\|/g, "\\|");
        lines.push(`| ${time} | ${msg} |`);
      }
      lines.push("");
    }

    lines.push("</details>");
    lines.push("");
  }

  // Footer
  lines.push(
    `_Generated on ${shortDate} by [standup CLI](https://github.com/Nabwinsaud/standup) \u00B7 Summarized by ${summary.model}_`,
  );

  return lines.join("\n");
}
