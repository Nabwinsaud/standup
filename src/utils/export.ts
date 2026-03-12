import dayjs from "dayjs";

/**
 * Save a markdown report to a file.
 * Returns the file path written.
 */
export async function exportReport(
  markdown: string,
  outputDir?: string,
): Promise<string> {
  const dir = outputDir ?? process.cwd();
  const filename = `standup-${dayjs().format("YYYY-MM-DD")}.md`;
  const filepath = `${dir}/${filename}`;

  await Bun.write(filepath, markdown);
  return filepath;
}
