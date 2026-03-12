import { defineCommand, runMain, showUsage } from "citty";
import ora from "ora";
import chalk from "chalk";

import { loadConfig, addRepoPath, removeRepoPath, openConfigInEditor } from "./config/load.ts";
import { getGitAuthor } from "./git/author.ts";
import { scanRepo, scanAllRepos } from "./git/repos.ts";
import { isGitRepo } from "./git/log.ts";
import { resolveRange } from "./utils/date.ts";
import { buildReport } from "./report/builder.ts";
import { renderTerminal, renderPlain } from "./report/terminal.ts";
import { renderMarkdown } from "./report/markdown.ts";
import { renderAITerminal, renderAIPlain, renderAIMarkdown } from "./report/ai.ts";
import { summarizeReport } from "./ai/summarize.ts";
import { copyToClipboard } from "./utils/clipboard.ts";
import { exportReport } from "./utils/export.ts";

const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Register a repo for multi-repo scanning",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the git repo",
      required: true,
    },
  },
  async run({ args }) {
    const resolved = args.path.startsWith("/")
      ? args.path
      : `${process.cwd()}/${args.path}`;

    if (!(await isGitRepo(resolved))) {
      console.error(chalk.red(`Not a git repository: ${resolved}`));
      process.exit(1);
    }

    await addRepoPath(resolved);
    console.log(chalk.green(`\u2713 Added: ${resolved}`));
  },
});

const removeCommand = defineCommand({
  meta: {
    name: "remove",
    description: "Unregister a repo",
  },
  args: {
    path: {
      type: "positional",
      description: "Path to the git repo",
      required: true,
    },
  },
  async run({ args }) {
    const resolved = args.path.startsWith("/")
      ? args.path
      : `${process.cwd()}/${args.path}`;

    await removeRepoPath(resolved);
    console.log(chalk.green(`\u2713 Removed: ${resolved}`));
  },
});

const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List all registered repos",
  },
  async run() {
    const config = await loadConfig();
    if (config.repos.paths.length === 0) {
      console.log(chalk.yellow("No repos registered. Use `standup add /path/to/repo` to add one."));
      return;
    }

    console.log(chalk.bold("Registered repos:\n"));
    for (const p of config.repos.paths) {
      const valid = await isGitRepo(p);
      const status = valid ? chalk.green("\u2713") : chalk.red("\u2717");
      console.log(`  ${status} ${p}`);
    }
  },
});

const configCommand = defineCommand({
  meta: {
    name: "config",
    description: "Open config file in your editor",
  },
  async run() {
    await openConfigInEditor();
  },
});

const mainCommand = defineCommand({
  meta: {
    name: "standup",
    version: "1.0.0",
    description: "Pull your git commits, shape them into a beautiful standup report.",
  },
  args: {
    today: {
      type: "boolean",
      description: "Use today's commits",
      default: false,
    },
    yesterday: {
      type: "boolean",
      description: "Use yesterday's commits",
      default: false,
    },
    since: {
      type: "string",
      description: 'Custom start date (e.g. "2 days ago", "2025-01-01")',
    },
    until: {
      type: "string",
      description: "Custom end date",
    },
    week: {
      type: "boolean",
      description: "Show this week's commits",
      default: false,
    },
    all: {
      type: "boolean",
      description: "Scan all registered repos",
      default: false,
    },
    repo: {
      type: "string",
      description: "Target a specific repo path",
    },
    author: {
      type: "string",
      description: "Filter by author name or email",
    },
    copy: {
      type: "boolean",
      description: "Copy report to clipboard",
      default: false,
    },
    export: {
      type: "boolean",
      description: "Save report as .md file",
      default: false,
    },
    md: {
      type: "boolean",
      description: "Output raw markdown",
      default: false,
    },
    json: {
      type: "boolean",
      description: "Output JSON",
      default: false,
    },
    "no-color": {
      type: "boolean",
      description: "Disable colored output",
      default: false,
    },
    ai: {
      type: "boolean",
      description: "Use AI to generate a human-readable standup summary",
      default: false,
    },
    tone: {
      type: "string",
      description: 'AI summary tone: "professional", "casual", or "bullet-points"',
    },
  },
  subCommands: {
    add: addCommand,
    remove: removeCommand,
    list: listCommand,
    config: configCommand,
  },
  async run({ args, cmd }) {
    // If user ran bare `standup` with no flags and cwd isn't a git repo, show help
    const hasFlags =
      args.today || args.yesterday || args.week || args.all ||
      args.since || args.repo || args.author || args.ai ||
      args.md || args.json || args.export || args.copy;

    if (!hasFlags && !(await isGitRepo(process.cwd()))) {
      await showUsage(cmd);
      return;
    }

    const config = await loadConfig();

    // Resolve author
    let authorFilter = args.author;
    if (!authorFilter) {
      if (config.user.name) {
        authorFilter = config.user.name;
      } else {
        const gitAuthor = await getGitAuthor();
        authorFilter = gitAuthor.name !== "Unknown" ? gitAuthor.name : undefined;
      }
    }

    // Resolve date range
    const range = resolveRange({
      today: args.today,
      yesterday: args.yesterday,
      since: args.since,
      until: args.until,
      week: args.week,
      defaultRange: config.report.default_range,
    });

    // Determine repos to scan
    const spinner = ora("Scanning commits...").start();

    try {
      let repos;

      if (args.all) {
        if (config.repos.paths.length === 0) {
          spinner.fail("No repos registered. Use `standup add /path/to/repo` to add one.");
          process.exit(1);
        }
        repos = await scanAllRepos(config, range, authorFilter);
      } else {
        const repoPath = args.repo ?? process.cwd();
        if (!(await isGitRepo(repoPath))) {
          spinner.fail(`Not a git repository: ${repoPath}`);
          process.exit(1);
        }
        const result = await scanRepo(repoPath, range, authorFilter);
        repos = [result];
      }

      spinner.stop();

      // Build report
      const report = buildReport(repos, range, authorFilter ?? "all");

      // Override AI tone from CLI flag if provided
      if (args.tone) {
        const tone = args.tone as "professional" | "casual" | "bullet-points";
        if (["professional", "casual", "bullet-points"].includes(tone)) {
          config.ai.tone = tone;
        }
      }

      // Auto-enable AI when exporting — PMs want the polished summary, not raw commits.
      // Only auto-enable if an API key is available. Skip silently otherwise.
      const hasApiKey = !!(config.ai.api_key || process.env.OPENAI_API_KEY);
      const useAI = args.ai || (args.export && hasApiKey);

      // JSON output (raw data, no AI)
      if (args.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      // AI summary mode
      if (useAI) {
        if (report.totalCommits === 0) {
          console.log(chalk.yellow("No commits found for this period. Nothing to summarize."));
          return;
        }

        const aiSpinner = ora("Generating AI summary...").start();
        try {
          const summary = await summarizeReport(report, config);
          aiSpinner.stop();

          if (args.md) {
            const md = renderAIMarkdown(report, summary);
            console.log(md);
          } else {
            const noColor = args["no-color"];
            const output = noColor
              ? renderAIPlain(report, summary)
              : renderAITerminal(report, summary, config);
            console.log(output);
          }

          // Copy AI markdown to clipboard
          if (args.copy) {
            const md = renderAIMarkdown(report, summary);
            try {
              await copyToClipboard(md);
              console.log(chalk.green("\u2713 Copied to clipboard!"));
            } catch {
              console.error(chalk.red("Failed to copy to clipboard."));
            }
          }

          // Export AI markdown
          if (args.export) {
            const md = renderAIMarkdown(report, summary);
            const filepath = await exportReport(md);
            console.log(chalk.green(`\u2713 Saved to ${filepath}`));
          }
        } catch (err) {
          aiSpinner.fail("Failed to generate AI summary.");
          if (err instanceof Error) {
            console.error(chalk.red(err.message));
          } else {
            console.error(err);
          }
          process.exit(1);
        }
        return;
      }

      // Markdown output
      if (args.md) {
        const md = renderMarkdown(report, config);
        console.log(md);
        return;
      }

      // Terminal output
      const noColor = args["no-color"];
      const output = noColor
        ? renderPlain(report, config)
        : renderTerminal(report, config);
      console.log(output);

      // Copy to clipboard
      if (args.copy) {
        const md = renderMarkdown(report, config);
        try {
          await copyToClipboard(md);
          console.log(chalk.green("\u2713 Copied to clipboard!"));
        } catch {
          console.error(chalk.red("Failed to copy to clipboard."));
        }
      }

      // Export to file
      if (args.export) {
        const md = renderMarkdown(report, config);
        const filepath = await exportReport(md);
        console.log(chalk.green(`\u2713 Saved to ${filepath}`));
      }
    } catch (err) {
      spinner.fail("Failed to generate standup report.");
      console.error(err);
      process.exit(1);
    }
  },
});

export { mainCommand };
