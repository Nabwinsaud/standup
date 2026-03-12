/**
 * Resolve the current git user's name and email from git config.
 */
export interface GitAuthor {
  name: string;
  email: string;
}

async function gitConfigGet(
  key: string,
  cwd?: string,
): Promise<string | null> {
  const proc = Bun.spawn(["git", "config", "--get", key], {
    cwd: cwd ?? process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });

  const text = await new Response(proc.stdout).text();
  await proc.exited;
  return proc.exitCode === 0 ? text.trim() : null;
}

/**
 * Get the current git author from local or global config.
 */
export async function getGitAuthor(cwd?: string): Promise<GitAuthor> {
  const [name, email] = await Promise.all([
    gitConfigGet("user.name", cwd),
    gitConfigGet("user.email", cwd),
  ]);

  return {
    name: name ?? "Unknown",
    email: email ?? "",
  };
}
