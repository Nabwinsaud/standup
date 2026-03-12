export interface StandupConfig {
  user: {
    name: string;
    email: string;
  };
  repos: {
    paths: string[];
  };
  display: {
    theme: "dark" | "light" | "minimal";
    show_hash: boolean;
    show_branch: boolean;
    emoji: boolean;
  };
  report: {
    default_range: "yesterday" | "today" | "week";
  };
  ai: {
    /** Provider: "openai" (default) or "azure". */
    provider: "openai" | "azure";
    /** OpenAI API key. Falls back to OPENAI_API_KEY env var. */
    api_key: string;
    /** Base URL — only needed for Azure (e.g. https://your-resource.openai.azure.com/openai/deployments/your-deployment). */
    base_url: string;
    /** Model to use for summarization. */
    model: string;
    /** System prompt tone: "professional" | "casual" | "bullet-points" */
    tone: "professional" | "casual" | "bullet-points";
  };
}

export const DEFAULT_CONFIG: StandupConfig = {
  user: {
    name: "",
    email: "",
  },
  repos: {
    paths: [],
  },
  display: {
    theme: "dark",
    show_hash: true,
    show_branch: true,
    emoji: true,
  },
  report: {
    default_range: "yesterday",
  },
  ai: {
    provider: "openai",
    api_key: "",
    base_url: "",
    model: "gpt-4o-mini",
    tone: "professional",
  },
};

export const CONFIG_DIR = `${process.env.HOME ?? "~"}/.standup`;
export const CONFIG_PATH = `${CONFIG_DIR}/config.toml`;
