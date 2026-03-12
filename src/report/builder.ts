import type { DateRange } from "../utils/date.ts";
import type { CommitInfo } from "../git/log.ts";
import type { RepoResult } from "../git/repos.ts";

export interface Report {
  date: Date;
  range: DateRange;
  repos: RepoResult[];
  totalCommits: number;
  author: string;
}

/**
 * Build a report data structure from scanned repos.
 */
export function buildReport(
  repos: RepoResult[],
  range: DateRange,
  author: string,
): Report {
  const totalCommits = repos.reduce((sum, r) => sum + r.commits.length, 0);

  return {
    date: new Date(),
    range,
    repos,
    totalCommits,
    author,
  };
}
