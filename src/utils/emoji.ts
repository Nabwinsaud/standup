/**
 * Maps conventional commit prefixes to emojis.
 */
const COMMIT_EMOJI_MAP: Record<string, string> = {
  feat: "\u2728",
  fix: "\uD83D\uDC1B",
  docs: "\uD83D\uDCDD",
  refactor: "\u267B\uFE0F",
  test: "\u2705",
  chore: "\uD83D\uDD27",
  style: "\uD83C\uDFA8",
  perf: "\u26A1",
  ci: "\uD83D\uDC77",
  revert: "\u23EA",
  build: "\uD83D\uDCE6",
  wip: "\uD83D\uDEA7",
};

const DEFAULT_EMOJI = "\uD83D\uDCCC";

/**
 * Given a commit message, return the appropriate emoji.
 * Detects conventional commit prefixes (e.g. "feat:", "fix(scope):").
 * If the message already starts with an emoji, returns empty string.
 */
export function getCommitEmoji(message: string): string {
  // If message already starts with a non-ASCII char (emoji), skip
  const firstChar = message.codePointAt(0);
  if (firstChar && firstChar > 0x7f) {
    return "";
  }

  // Match conventional commit: type(scope)?: message
  const match = message.match(/^(\w+)(?:\(.+?\))?!?:/);
  if (match) {
    const type = match[1]!.toLowerCase();
    return COMMIT_EMOJI_MAP[type] ?? DEFAULT_EMOJI;
  }

  return DEFAULT_EMOJI;
}

/**
 * Prepend emoji to a commit message if it doesn't already have one.
 */
export function emojify(message: string): string {
  const emoji = getCommitEmoji(message);
  if (!emoji) return message; // already has emoji
  return `${emoji} ${message}`;
}

/**
 * Strip the conventional commit prefix for cleaner display.
 * "feat(auth): add login" -> "Add login"
 */
export function cleanMessage(message: string): string {
  const match = message.match(/^(\w+)(?:\(.+?\))?!?:\s*(.*)/);
  if (match) {
    const body = match[2]!;
    return body.charAt(0).toUpperCase() + body.slice(1);
  }
  return message;
}

/**
 * Format a commit message: get emoji from the original message,
 * clean the prefix, then combine.
 * "feat(auth): add login" -> "✨ Add login"
 */
export function formatCommitMessage(
  message: string,
  useEmoji: boolean,
): string {
  if (!useEmoji) return cleanMessage(message);

  const emoji = getCommitEmoji(message);
  const clean = cleanMessage(message);
  if (!emoji) return clean; // message already had an emoji
  return `${emoji} ${clean}`;
}
