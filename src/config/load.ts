import { parse as parseTOML, stringify as stringifyTOML } from "smol-toml";
import type { StandupConfig } from "./defaults.ts";
import { DEFAULT_CONFIG, CONFIG_DIR, CONFIG_PATH } from "./defaults.ts";
import { mergeConfig } from "./schema.ts";

/**
 * Load the config from ~/.standup/config.toml.
 * Creates default config if it doesn't exist.
 */
export async function loadConfig(): Promise<StandupConfig> {
  const file = Bun.file(CONFIG_PATH);
  const exists = await file.exists();

  if (!exists) {
    return DEFAULT_CONFIG;
  }

  try {
    const text = await file.text();
    const parsed = parseTOML(text);
    return mergeConfig(parsed as Record<string, unknown>);
  } catch {
    // If parse fails, return defaults
    return DEFAULT_CONFIG;
  }
}

/**
 * Save the current config to disk, creating the directory if needed.
 */
export async function saveConfig(config: StandupConfig): Promise<void> {
  // Ensure directory exists
  await Bun.spawn(["mkdir", "-p", CONFIG_DIR]).exited;

  const toml = stringifyTOML(config as unknown as Record<string, unknown>);
  await Bun.write(CONFIG_PATH, toml);
}

/**
 * Add a repo path to the config.
 */
export async function addRepoPath(repoPath: string): Promise<StandupConfig> {
  const config = await loadConfig();
  const resolved = repoPath.replace(/\/$/, "");

  if (!config.repos.paths.includes(resolved)) {
    config.repos.paths.push(resolved);
    await saveConfig(config);
  }

  return config;
}

/**
 * Remove a repo path from the config.
 */
export async function removeRepoPath(
  repoPath: string,
): Promise<StandupConfig> {
  const config = await loadConfig();
  const resolved = repoPath.replace(/\/$/, "");

  config.repos.paths = config.repos.paths.filter((p) => p !== resolved);
  await saveConfig(config);

  return config;
}

/**
 * Open config in the user's $EDITOR.
 */
export async function openConfigInEditor(): Promise<void> {
  const config = await loadConfig();

  // Ensure file exists with defaults
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    await saveConfig(config);
  }

  const editor = process.env.EDITOR ?? process.env.VISUAL ?? "vi";
  const proc = Bun.spawn([editor, CONFIG_PATH], {
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}
