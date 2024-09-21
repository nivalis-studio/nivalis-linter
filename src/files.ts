import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import fg from "fast-glob";
import type { ESLint } from "eslint";
import pLimit from "p-limit";

export const getFilesToLint = async (
  eslint: ESLint,
  patterns: string[],

  concurrency: number = os.cpus().length,
) => {
  const globPatterns = patterns.flatMap((pattern) => {
    if (!fs.existsSync(pattern)) {
      return pattern;
    }

    const stats = fs.lstatSync(pattern);

    if (stats.isDirectory()) {
      return path.join(pattern, "**/*.{js,jsx,ts,tsx}");
    }

    if (stats.isFile()) {
      return pattern;
    }

    return [];
  });

  const files = await fg(globPatterns, { dot: true, absolute: true });

  await eslint.isPathIgnored(files[0]);

  const limit = pLimit(concurrency);

  const results = (
    await Promise.all(
      files.map(async (file) =>
        limit(async () => {
          const isIgnored = await eslint.isPathIgnored(file);
          return !isIgnored ? file : null;
        }),
      ),
    )
  ).filter(Boolean) as string[];

  return results;
};
