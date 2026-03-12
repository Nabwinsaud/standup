/**
 * Copy text to the system clipboard.
 * Uses pbcopy on macOS, xclip on Linux, and clip on Windows.
 */
export async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform;

  let cmd: string[];
  if (platform === "darwin") {
    cmd = ["pbcopy"];
  } else if (platform === "win32") {
    cmd = ["clip"];
  } else {
    // Linux: try xclip first, fallback to xsel, then wl-copy (Wayland)
    cmd = ["xclip", "-selection", "clipboard"];
  }

  const proc = Bun.spawn(cmd, {
    stdin: "pipe",
  });

  proc.stdin.write(text);
  proc.stdin.end();
  await proc.exited;

  if (proc.exitCode !== 0) {
    throw new Error(`Failed to copy to clipboard (exit code ${proc.exitCode})`);
  }
}
