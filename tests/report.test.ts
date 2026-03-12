import { test, expect, describe } from "bun:test";
import { buildReport } from "../src/report/builder.ts";
import { renderMarkdown } from "../src/report/markdown.ts";
import { renderPlain } from "../src/report/terminal.ts";
import { DEFAULT_CONFIG } from "../src/config/defaults.ts";
import { formatCommitMessage } from "../src/utils/emoji.ts";
import type { RepoResult } from "../src/git/repos.ts";
import type { DateRange } from "../src/utils/date.ts";

const mockRange: DateRange = {
  since: new Date("2025-01-10T00:00:00"),
  until: new Date("2025-01-10T23:59:59"),
  label: "Yesterday",
};

const mockRepos: RepoResult[] = [
  {
    name: "my-app",
    path: "/home/user/my-app",
    branch: "main",
    commits: [
      {
        hash: "abc123def456",
        shortHash: "abc123d",
        message: "feat(auth): add login middleware",
        author: "Test User",
        email: "test@test.com",
        date: new Date("2025-01-10T10:32:00"),
        branch: "main",
        repo: "my-app",
      },
      {
        hash: "def456abc789",
        shortHash: "def456a",
        message: "fix: token expiry bug",
        author: "Test User",
        email: "test@test.com",
        date: new Date("2025-01-10T14:15:00"),
        branch: "main",
        repo: "my-app",
      },
    ],
  },
];

describe("report builder", () => {
  test("buildReport creates correct structure", () => {
    const report = buildReport(mockRepos, mockRange, "Test User");
    expect(report.totalCommits).toBe(2);
    expect(report.repos).toHaveLength(1);
    expect(report.author).toBe("Test User");
    expect(report.range.label).toBe("Yesterday");
  });

  test("buildReport counts commits across repos", () => {
    const twoRepos: RepoResult[] = [
      ...mockRepos,
      {
        name: "api",
        path: "/home/user/api",
        branch: "develop",
        commits: [
          {
            hash: "111222333",
            shortHash: "1112223",
            message: "refactor: user routes",
            author: "Test User",
            email: "test@test.com",
            date: new Date("2025-01-10T09:10:00"),
            branch: "develop",
            repo: "api",
          },
        ],
      },
    ];
    const report = buildReport(twoRepos, mockRange, "Test User");
    expect(report.totalCommits).toBe(3);
    expect(report.repos).toHaveLength(2);
  });
});

describe("markdown renderer", () => {
  test("renders valid markdown", () => {
    const report = buildReport(mockRepos, mockRange, "Test User");
    const md = renderMarkdown(report, DEFAULT_CONFIG);

    expect(md).toContain("## Standup");
    expect(md).toContain("### my-app");
    expect(md).toContain("| Commit |");
    expect(md).toContain("Add login middleware");
    expect(md).toContain("Token expiry bug");
    expect(md).toContain("2 commits across 1 repo");
  });

  test("renders emoji when enabled", () => {
    const report = buildReport(mockRepos, mockRange, "Test User");
    const md = renderMarkdown(report, DEFAULT_CONFIG);
    expect(md).toContain("\u2728"); // feat emoji
    expect(md).toContain("\uD83D\uDC1B"); // fix emoji
  });

  test("skips emoji when disabled", () => {
    const config = { ...DEFAULT_CONFIG, display: { ...DEFAULT_CONFIG.display, emoji: false } };
    const report = buildReport(mockRepos, mockRange, "Test User");
    const md = renderMarkdown(report, config);
    expect(md).not.toContain("\u2728");
  });
});

describe("plain text renderer", () => {
  test("renders plain text without ANSI codes", () => {
    const report = buildReport(mockRepos, mockRange, "Test User");
    const plain = renderPlain(report, DEFAULT_CONFIG);

    expect(plain).toContain("STANDUP");
    expect(plain).toContain("my-app");
    expect(plain).toContain("2 commits across 1 repo");
    // Should not contain ANSI escape codes
    expect(plain).not.toMatch(/\x1b\[/);
  });
});
