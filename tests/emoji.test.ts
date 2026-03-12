import { test, expect, describe } from "bun:test";
import { getCommitEmoji, emojify, cleanMessage, formatCommitMessage } from "../src/utils/emoji.ts";

describe("emoji utils", () => {
  test("getCommitEmoji returns correct emoji for feat:", () => {
    expect(getCommitEmoji("feat: add login")).toBe("\u2728");
  });

  test("getCommitEmoji returns correct emoji for fix:", () => {
    expect(getCommitEmoji("fix: broken auth")).toBe("\uD83D\uDC1B");
  });

  test("getCommitEmoji handles scoped prefix", () => {
    expect(getCommitEmoji("feat(auth): add login")).toBe("\u2728");
  });

  test("getCommitEmoji returns default for unknown prefix", () => {
    expect(getCommitEmoji("random commit message")).toBe("\uD83D\uDCCC");
  });

  test("getCommitEmoji returns empty for messages starting with emoji", () => {
    expect(getCommitEmoji("\u2728 something")).toBe("");
  });

  test("emojify prepends emoji to conventional commit", () => {
    const result = emojify("Add login");
    expect(result).toContain("\uD83D\uDCCC");
  });

  test("emojify does not double-add emoji", () => {
    const result = emojify("\u2728 already has emoji");
    expect(result).toBe("\u2728 already has emoji");
  });

  test("cleanMessage strips conventional prefix", () => {
    expect(cleanMessage("feat: add login")).toBe("Add login");
    expect(cleanMessage("fix(auth): broken token")).toBe("Broken token");
  });

  test("cleanMessage returns original for non-conventional", () => {
    expect(cleanMessage("just a message")).toBe("just a message");
  });

  test("formatCommitMessage combines emoji from original + cleaned body", () => {
    expect(formatCommitMessage("feat(auth): add login", true)).toBe("\u2728 Add login");
    expect(formatCommitMessage("fix: broken auth", true)).toBe("\uD83D\uDC1B Broken auth");
    expect(formatCommitMessage("random message", true)).toBe("\uD83D\uDCCC random message");
  });

  test("formatCommitMessage skips emoji when disabled", () => {
    expect(formatCommitMessage("feat: add login", false)).toBe("Add login");
    expect(formatCommitMessage("random message", false)).toBe("random message");
  });

  test("formatCommitMessage preserves existing emoji", () => {
    expect(formatCommitMessage("\u2728 already has emoji", true)).toBe("\u2728 already has emoji");
  });
});
