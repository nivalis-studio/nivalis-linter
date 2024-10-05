import path from "node:path";
import fs from "node:fs";
import fg from "fast-glob";

export const getFilesToLint =  (patterns: string[]) => {
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

  return fg.stream(globPatterns, { dot: true, absolute: true, ignore:
     ["node_modules/**", "**/node_modules/**"]
   });
};
