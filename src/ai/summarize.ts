import OpenAI from "openai";
import type { Report } from "../report/builder.ts";
import type { StandupConfig } from "../config/defaults.ts";
import dayjs from "dayjs";

/**
 * Build a prompt from the report data that the LLM can summarize.
 */
function buildPrompt(report: Report, config: StandupConfig): string {
  const lines: string[] = [];

  const sinceFmt = dayjs(report.range.since).format("YYYY-MM-DD");
  const untilFmt = dayjs(report.range.until).format("YYYY-MM-DD");
  const author = report.author !== "all" ? report.author : "the team";

  lines.push(`Author: ${author}`);
  lines.push(`Period: ${report.range.label} (${sinceFmt} to ${untilFmt})`);
  lines.push(`Total commits: ${report.totalCommits}`);
  lines.push("");

  for (const repo of report.repos) {
    if (repo.commits.length === 0) continue;
    lines.push(`Project: ${repo.name}`);
    for (const c of repo.commits) {
      const time = dayjs(c.date).format("YYYY-MM-DD HH:mm");
      lines.push(`- [${time}] ${c.message}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get the system prompt based on tone setting.
 * All tones produce well-structured markdown suitable for a PM.
 */
function getSystemPrompt(tone: StandupConfig["ai"]["tone"]): string {
  const base = `You are a senior engineering lead writing a standup update for a project manager or stakeholder.

Your job: take raw git commit messages and produce a CLEAN, STRUCTURED standup report in markdown.

Critical rules:
- NEVER mention commit hashes, branch names, git internals, or code-level details (function names, file paths, variable names)
- NEVER say "committed", "pushed", "merged" — speak in terms of WORK DONE
- Group related commits into ONE bullet. If 5 commits are all about "fixing payment", that's ONE bullet: "Resolved payment processing issues"
- Use past tense: "Implemented", "Fixed", "Improved", "Added", "Resolved"
- Focus on BUSINESS VALUE — what does this mean for the product/user?
- Deduplicate aggressively — same work mentioned twice = mention it once
- If a commit message is vague (e.g. "fix build", "wip"), fold it into the nearest related item or skip it
- Keep each bullet to 1 sentence max`;

  switch (tone) {
    case "professional":
      return `${base}

Output format — use EXACTLY these markdown sections:

### Completed
- Bullet points of finished work, grouped by theme/feature area
- Each bullet should be understandable by a non-technical PM

### In Progress
- Any work-in-progress items (look for WIP, draft, partial commits)
- If none found, write "No items currently in progress."

### Notes
- Anything notable: repeated fixes suggesting instability, reverts, large refactors
- If nothing notable, OMIT this section entirely

Keep language formal, concise, and jargon-free. This report goes directly to stakeholders.`;

    case "casual":
      return `${base}

Write a short, friendly update — like you'd send in a Slack channel. 2-3 short paragraphs max. No section headers. Use plain language.`;

    case "bullet-points":
      return `${base}

Output ONLY a flat bullet list. No headers, no paragraphs. Maximum 8 bullets.
Merge related work into single bullets. Most impactful items first.`;

    default:
      return base;
  }
}

export interface AISummaryResult {
  summary: string;
  model: string;
  tokensUsed: number;
}

/**
 * Summarize a standup report using an LLM.
 * Works with OpenAI API or any compatible endpoint (Azure OpenAI, etc.)
 */
export async function summarizeReport(
  report: Report,
  config: StandupConfig,
): Promise<AISummaryResult> {
  const apiKey = config.ai.api_key || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "No API key found. Set OPENAI_API_KEY env var or add ai.api_key to ~/.standup/config.toml",
    );
  }

  // OpenAI: no base URL needed. Azure: must provide base_url.
  const clientOpts: { apiKey: string; baseURL?: string } = { apiKey };

  if (config.ai.provider === "azure") {
    if (!config.ai.base_url) {
      throw new Error(
        "Azure provider requires ai.base_url in ~/.standup/config.toml (e.g. https://your-resource.openai.azure.com/openai/deployments/your-deployment)",
      );
    }
    clientOpts.baseURL = config.ai.base_url;
  }

  const client = new OpenAI(clientOpts);

  const userPrompt = buildPrompt(report, config);

  const response = await client.chat.completions.create({
    model: config.ai.model,
    messages: [
      { role: "system", content: getSystemPrompt(config.ai.tone) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1024,
  });

  const summary =
    response.choices[0]?.message?.content ?? "No summary generated.";
  const tokensUsed = response.usage?.total_tokens ?? 0;

  return {
    summary: summary.trim(),
    model: config.ai.model,
    tokensUsed,
  };
}
