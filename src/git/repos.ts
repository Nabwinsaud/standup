import type { StandupConfig } from "../config/defaults.ts";
import type { DateRange } from "../utils/date.ts";
import type { CommitInfo } from "./log.ts";
import { getGitLog, isGitRepo } from "./log.ts";

export interface RepoResult {
  name: string;
  path: string;
  branch: string;
  commits: CommitInfo[];
  error?: string;
}

/**
 * Get the current branch for a repo.
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
 * Get repo name from path.
 */
function getRepoName(repoPath: string): string {
  return repoPath.split("/").filter(Boolean).pop() ?? "unknown";
}

/**
 * Scan a single repo for commits.
 */
export async function scanRepo(
  repoPath: string,
  range: DateRange,
  author?: string,
): Promise<RepoResult> {
  const name = getRepoName(repoPath);

  if (!(await isGitRepo(repoPath))) {
    return {
      name,
      path: repoPath,
      branch: "unknown",
      commits: [],
      error: `Not a git repository: ${repoPath}`,
    };
  }

  const [commits, branch] = await Promise.all([
    getGitLog({ cwd: repoPath, range, author }),
    getCurrentBranch(repoPath),
  ]);

  return { name, path: repoPath, branch, commits };
}

/**
 * Scan multiple repos from config.
 */
export async function scanAllRepos(
  config: StandupConfig,
  range: DateRange,
  author?: string,
): Promise<RepoResult[]> {
  const paths = config.repos.paths;

  if (paths.length === 0) {
    return [];
  }

  const results = await Promise.all(
    paths.map((p) => scanRepo(p, range, author)),
  );

  // Filter out repos with no commits (unless they have errors)
  return results.filter((r) => r.commits.length > 0 || r.error);
}
