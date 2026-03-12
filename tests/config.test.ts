import { test, expect, describe } from "bun:test";
import { mergeConfig } from "../src/config/schema.ts";
import { DEFAULT_CONFIG } from "../src/config/defaults.ts";

describe("config schema", () => {
  test("mergeConfig returns defaults for empty input", () => {
    const config = mergeConfig({});
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  test("mergeConfig merges user settings", () => {
    const config = mergeConfig({
      user: { name: "Test User", email: "test@example.com" },
    });
    expect(config.user.name).toBe("Test User");
    expect(config.user.email).toBe("test@example.com");
  });

  test("mergeConfig merges repos", () => {
    const config = mergeConfig({
      repos: { paths: ["/some/repo", "/another/repo"] },
    });
    expect(config.repos.paths).toEqual(["/some/repo", "/another/repo"]);
  });

  test("mergeConfig validates display theme", () => {
    const config = mergeConfig({
      display: { theme: "light" },
    });
    expect(config.display.theme).toBe("light");
  });

  test("mergeConfig ignores invalid theme", () => {
    const config = mergeConfig({
      display: { theme: "neon" },
    });
    expect(config.display.theme).toBe("dark"); // default
  });

  test("mergeConfig merges display booleans", () => {
    const config = mergeConfig({
      display: { show_hash: false, emoji: false },
    });
    expect(config.display.show_hash).toBe(false);
    expect(config.display.emoji).toBe(false);
    expect(config.display.show_branch).toBe(true); // default
  });

  test("mergeConfig validates report default_range", () => {
    const config = mergeConfig({
      report: { default_range: "week" },
    });
    expect(config.report.default_range).toBe("week");
  });

  test("mergeConfig ignores invalid default_range", () => {
    const config = mergeConfig({
      report: { default_range: "month" },
    });
    expect(config.report.default_range).toBe("yesterday"); // default
  });

  test("mergeConfig filters non-string repo paths", () => {
    const config = mergeConfig({
      repos: { paths: ["/valid", 123, null, "/also-valid"] },
    });
    expect(config.repos.paths).toEqual(["/valid", "/also-valid"]);
  });

  test("mergeConfig defaults ai.provider to openai", () => {
    const config = mergeConfig({});
    expect(config.ai.provider).toBe("openai");
    expect(config.ai.base_url).toBe("");
  });

  test("mergeConfig merges ai.provider azure", () => {
    const config = mergeConfig({
      ai: { provider: "azure", base_url: "https://my-resource.openai.azure.com/openai/deployments/gpt4" },
    });
    expect(config.ai.provider).toBe("azure");
    expect(config.ai.base_url).toBe("https://my-resource.openai.azure.com/openai/deployments/gpt4");
  });

  test("mergeConfig ignores invalid ai.provider", () => {
    const config = mergeConfig({
      ai: { provider: "anthropic" },
    });
    expect(config.ai.provider).toBe("openai"); // default
  });
});
