import type { StandupConfig } from "./defaults.ts";
import { DEFAULT_CONFIG } from "./defaults.ts";

/**
 * Deep-merge a partial config (from TOML) onto the defaults.
 * Only known keys are kept; unknown keys are ignored.
 */
export function mergeConfig(partial: Record<string, unknown>): StandupConfig {
  const config = structuredClone(DEFAULT_CONFIG);

  // user
  if (isObj(partial.user)) {
    const u = partial.user as Record<string, unknown>;
    if (typeof u.name === "string") config.user.name = u.name;
    if (typeof u.email === "string") config.user.email = u.email;
  }

  // repos
  if (isObj(partial.repos)) {
    const r = partial.repos as Record<string, unknown>;
    if (Array.isArray(r.paths)) {
      config.repos.paths = r.paths.filter(
        (p): p is string => typeof p === "string",
      );
    }
  }

  // display
  if (isObj(partial.display)) {
    const d = partial.display as Record<string, unknown>;
    if (d.theme === "dark" || d.theme === "light" || d.theme === "minimal") {
      config.display.theme = d.theme;
    }
    if (typeof d.show_hash === "boolean") config.display.show_hash = d.show_hash;
    if (typeof d.show_branch === "boolean")
      config.display.show_branch = d.show_branch;
    if (typeof d.emoji === "boolean") config.display.emoji = d.emoji;
  }

  // report
  if (isObj(partial.report)) {
    const rp = partial.report as Record<string, unknown>;
    if (
      rp.default_range === "yesterday" ||
      rp.default_range === "today" ||
      rp.default_range === "week"
    ) {
      config.report.default_range = rp.default_range;
    }
  }

  // ai
  if (isObj(partial.ai)) {
    const a = partial.ai as Record<string, unknown>;
    if (a.provider === "openai" || a.provider === "azure") {
      config.ai.provider = a.provider;
    }
    if (typeof a.api_key === "string") config.ai.api_key = a.api_key;
    if (typeof a.base_url === "string") config.ai.base_url = a.base_url;
    if (typeof a.model === "string") config.ai.model = a.model;
    if (
      a.tone === "professional" ||
      a.tone === "casual" ||
      a.tone === "bullet-points"
    ) {
      config.ai.tone = a.tone;
    }
  }

  return config;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
