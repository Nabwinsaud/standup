import type { DateRange } from "../utils/date.ts";
import { toGitDate } from "../utils/date.ts";

export interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  email: string;
  date: Date;
  branch: string;
  repo: string;
}

const LOG_FORMAT = "%H%n%h%n%s%n%an%n%ae%n%aI";
const SEPARATOR = "---COMMIT_END---";

/**
 * Get the current branch name for a repo.
 */
async function getCurrentBranch(cwd: string): Promise<string> {
  const proc = Bun.spawn(
    ["git", "rev-parse", "--abbrev-ref", "HEAD"],
    { cwd, stdout: "pipe", stderr: "pipe" },
  );
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return text.trim() || "unknown";
}

/**
 * Get the repo name from the directory path.
 */
function getRepoName(cwd: string): string {
  return cwd.split("/").filter(Boolean).pop() ?? "unknown";
}

/**
 * Parse git log output into CommitInfo objects.
 */
function parseLogOutput(raw: string, repo: string): CommitInfo[] {
  const commits: CommitInfo[] = [];
  const blocks = raw.split(SEPARATOR).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 6) continue;

    // Each line may contain a branch decoration from --decorate,
    // but we use a separate branch lookup.
    // The format lines are: hash, shortHash, subject, author, email, date
    const [hash, shortHash, message, author, email, dateStr, ...branchLines] =
      lines;

    const branch = branchLines.join("").trim() || "";

    commits.push({
      hash: hash!,
      shortHash: shortHash!,
      message: message!,
      author: author!,
      email: email!,
      date: new Date(dateStr!),
      branch,
      repo,
    });
  }

  return commits;
}

export interface GetLogOptions {
  cwd: string;
  range: DateRange;
  author?: string;
}

/**
 * Fetch commits from a git repo within a date range, optionally filtered by author.
 */
export async function getGitLog(opts: GetLogOptions): Promise<CommitInfo[]> {
  const { cwd, range, author } = opts;

  const args = [
    "git",
    "log",
    "--all",
    `--format=${LOG_FORMAT}${SEPARATOR}`,
    `--since=${toGitDate(range.since)}`,
    `--until=${toGitDate(range.until)}`,
  ];

  if (author) {
    args.push(`--author=${author}`);
  }

  const proc = Bun.spawn(args, {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  if (proc.exitCode !== 0) {
    return [];
  }

  const repoName = getRepoName(cwd);
  const commits = parseLogOutput(stdout, repoName);

  // Enrich with branch info — get the current branch once
  const currentBranch = await getCurrentBranch(cwd);

  // For each commit, find which branches contain it
  for (const commit of commits) {
    if (!commit.branch) {
      // Try to find the branch for this commit
      const branchProc = Bun.spawn(
        ["git", "branch", "--contains", commit.hash, "--format=%(refname:short)"],
        { cwd, stdout: "pipe", stderr: "pipe" },
      );
      const branchText = await new Response(branchProc.stdout).text();
      await branchProc.exited;

      const branches = branchText.trim().split("\n").filter(Boolean);
      // Prefer current branch if commit is on it, otherwise take first
      commit.branch = branches.includes(currentBranch)
        ? currentBranch
        : branches[0] ?? currentBranch;
    }
  }

  // Sort by date descending (most recent first)
  commits.sort((a, b) => a.date.getTime() - b.date.getTime());

  return commits;
}

/**
 * Check if a directory is a valid git repo.
 */
export async function isGitRepo(dir: string): Promise<boolean> {
  const proc = Bun.spawn(
    ["git", "rev-parse", "--is-inside-work-tree"],
    { cwd: dir, stdout: "pipe", stderr: "pipe" },
  );
  await proc.exited;
  return proc.exitCode === 0;
}
