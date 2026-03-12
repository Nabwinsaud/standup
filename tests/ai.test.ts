import { test, expect, describe } from "bun:test";
import { buildReport } from "../src/report/builder.ts";
import { renderAITerminal, renderAIPlain, renderAIMarkdown } from "../src/report/ai.ts";
import { DEFAULT_CONFIG } from "../src/config/defaults.ts";
import type { AISummaryResult } from "../src/ai/summarize.ts";
import type { RepoResult } from "../src/git/repos.ts";
import type { DateRange } from "../src/utils/date.ts";

// ─── Fixtures ────────────────────────────────────────────────────────

const mockRange: DateRange = {
  since: new Date("2025-06-10T00:00:00"),
  until: new Date("2025-06-10T23:59:59"),
  label: "Yesterday",
};

const mockRepos: RepoResult[] = [
  {
    name: "my-app",
    path: "/home/dev/my-app",
    branch: "main",
    commits: [
      {
        hash: "aaa111bbb222",
        shortHash: "aaa111b",
        message: "feat(checkout): add Stripe payment integration",
        author: "Jane Dev",
        email: "jane@example.com",
        date: new Date("2025-06-10T10:30:00"),
        branch: "main",
        repo: "my-app",
      },
      {
        hash: "ccc333ddd444",
        shortHash: "ccc333d",
        message: "fix(auth): resolve token expiry on mobile OAuth",
        author: "Jane Dev",
        email: "jane@example.com",
        date: new Date("2025-06-10T12:45:00"),
        branch: "main",
        repo: "my-app",
      },
      {
        hash: "eee555fff666",
        shortHash: "eee555f",
        message: "chore: update dependencies",
        author: "Jane Dev",
        email: "jane@example.com",
        date: new Date("2025-06-10T15:00:00"),
        branch: "main",
        repo: "my-app",
      },
    ],
  },
];

const professionalSummary: AISummaryResult = {
  summary: `### Completed
- Implemented payment processing integration with Stripe
- Resolved authentication token expiry issues affecting mobile OAuth users
- Updated project dependencies to latest stable versions

### In Progress
No items currently in progress.

### Notes
- The authentication fix addresses a recurring issue on mobile platforms that was causing login failures.`,
  model: "gpt-4o-mini",
  tokensUsed: 285,
};

const casualSummary: AISummaryResult = {
  summary: `Wrapped up the Stripe payment integration — users can now checkout. Also fixed auth token issues that were causing mobile login failures. Did a quick dependency update to keep things current.`,
  model: "gpt-4o-mini",
  tokensUsed: 180,
};

const bulletSummary: AISummaryResult = {
  summary: `- Implemented payment processing via Stripe
- Fixed authentication token expiry on mobile OAuth
- Updated project dependencies`,
  model: "gpt-4o-mini",
  tokensUsed: 120,
};

// ─── AI renderers ────────────────────────────────────────────────────

describe("AI terminal renderer", () => {
  test("renders header with date", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAITerminal(report, professionalSummary, DEFAULT_CONFIG);
    expect(output).toContain("AI STANDUP");
  });

  test("renders section headers from professional summary", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAITerminal(report, professionalSummary, DEFAULT_CONFIG);
    expect(output).toContain("Completed");
    expect(output).toContain("In Progress");
    expect(output).toContain("Notes");
  });

  test("renders bullet points", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAITerminal(report, professionalSummary, DEFAULT_CONFIG);
    expect(output).toContain("payment processing integration");
    expect(output).toContain("Stripe");
  });

  test("renders footer with commit count and model info", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAITerminal(report, professionalSummary, DEFAULT_CONFIG);
    expect(output).toContain("3 commits");
    expect(output).toContain("my-app");
    expect(output).toContain("gpt-4o-mini");
    expect(output).toContain("285 tokens");
  });

  test("handles zero-commit report", () => {
    const emptyRepos: RepoResult[] = [
      { name: "empty-repo", path: "/tmp/empty", branch: "main", commits: [] },
    ];
    const report = buildReport(emptyRepos, mockRange, "Jane Dev");
    const output = renderAITerminal(report, professionalSummary, DEFAULT_CONFIG);
    expect(output).toContain("No commits found");
  });
});

describe("AI plain renderer", () => {
  test("renders without ANSI codes", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAIPlain(report, professionalSummary);
    expect(output).not.toMatch(/\x1b\[/);
  });

  test("includes summary text", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAIPlain(report, professionalSummary);
    expect(output).toContain("### Completed");
    expect(output).toContain("payment processing integration");
  });

  test("includes commit count footer", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAIPlain(report, professionalSummary);
    expect(output).toContain("3 commits");
    expect(output).toContain("my-app");
  });
});

describe("AI markdown renderer", () => {
  test("renders title with date", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("# Standup Report");
    expect(md).toMatch(/# Standup Report — \w+, \w+ \d+, \d{4}/);
  });

  test("renders metadata table", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("| **Author** | Jane Dev |");
    expect(md).toContain("| **Period** | Yesterday |");
    expect(md).toContain("| **Project** | my-app |");
    expect(md).toContain("| **Changes** | 3 commits |");
  });

  test("includes AI summary body", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("### Completed");
    expect(md).toContain("payment processing integration");
    expect(md).toContain("### In Progress");
    expect(md).toContain("### Notes");
  });

  test("includes collapsible commit log", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("<details>");
    expect(md).toContain("Detailed commit log");
    expect(md).toContain("#### my-app");
    expect(md).toContain("| Time | Description |");
    expect(md).toContain("10:30");
    expect(md).toContain("add Stripe payment integration");
  });

  test("includes footer with model attribution", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("gpt-4o-mini");
    expect(md).toContain("standup CLI");
  });

  test("omits author row when author is 'all'", () => {
    const report = buildReport(mockRepos, mockRange, "all");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).not.toContain("| **Author** |");
  });

  test("handles multi-repo reports", () => {
    const twoRepos: RepoResult[] = [
      ...mockRepos,
      {
        name: "api-service",
        path: "/home/dev/api-service",
        branch: "main",
        commits: [
          {
            hash: "ggg777hhh888",
            shortHash: "ggg777h",
            message: "feat: add rate limiting middleware",
            author: "Jane Dev",
            email: "jane@example.com",
            date: new Date("2025-06-10T16:00:00"),
            branch: "main",
            repo: "api-service",
          },
        ],
      },
    ];
    const report = buildReport(twoRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, professionalSummary);
    expect(md).toContain("**Projects**");
    expect(md).toContain("my-app, api-service");
    expect(md).toContain("4 commits");
    expect(md).toContain("#### api-service");
  });
});

// ─── AI summary tone variants ────────────────────────────────────────

describe("AI renderer with different tones", () => {
  test("casual summary renders as paragraph", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAIPlain(report, casualSummary);
    expect(output).toContain("Wrapped up the Stripe payment integration");
    expect(output).not.toContain("###"); // casual has no headers
  });

  test("bullet-points summary renders as flat list", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const output = renderAIPlain(report, bulletSummary);
    expect(output).toContain("- Implemented payment processing");
    expect(output).toContain("- Fixed authentication");
    expect(output).not.toContain("###"); // bullets have no headers
  });

  test("casual summary in markdown still has metadata table", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const md = renderAIMarkdown(report, casualSummary);
    expect(md).toContain("# Standup Report");
    expect(md).toContain("| **Author** |");
    expect(md).toContain("Wrapped up the Stripe payment integration");
  });
});

// ─── summarizeReport (mocked OpenAI) ─────────────────────────────────

describe("summarizeReport with mocked OpenAI", () => {
  test("throws when no API key is set", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const { summarizeReport } = await import("../src/ai/summarize.ts");
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const config = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, api_key: "" },
    };

    expect(summarizeReport(report, config)).rejects.toThrow("No API key found");

    if (original !== undefined) process.env.OPENAI_API_KEY = original;
  });

  test("throws when azure provider has no base_url", async () => {
    const original = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";

    const { summarizeReport } = await import("../src/ai/summarize.ts");
    const report = buildReport(mockRepos, mockRange, "Jane Dev");
    const config = {
      ...DEFAULT_CONFIG,
      ai: { ...DEFAULT_CONFIG.ai, provider: "azure" as const, api_key: "test-key", base_url: "" },
    };

    expect(summarizeReport(report, config)).rejects.toThrow("Azure provider requires");

    if (original !== undefined) {
      process.env.OPENAI_API_KEY = original;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
  });

  test("builds correct report structure for prompt", () => {
    const report = buildReport(mockRepos, mockRange, "Jane Dev");

    expect(report.author).toBe("Jane Dev");
    expect(report.range.label).toBe("Yesterday");
    expect(report.totalCommits).toBe(3);
    expect(report.repos[0]!.name).toBe("my-app");
    expect(report.repos[0]!.commits[0]!.message).toContain("Stripe");
  });
});
