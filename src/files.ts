import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";

export const getFilesToLint = async (patterns: string[]) => {
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
  return files;
};
