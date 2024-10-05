import path from "node:path";
import ignore from 'ignore'
import fs from "node:fs";
import fg from "fast-glob";

export const getFilesToLint =  (patterns: string[]) => {

  const gitignore = path.join(process.cwd(), ".gitignore");
  const ignorePatterns: string[] = [".git"];

  if (fs.existsSync(gitignore)) {
    const gitignoreContent = fs.readFileSync(gitignore, "utf8");
    const lines = gitignoreContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("!"));

    ignorePatterns.push(...lines);
  }

  const ig = ignore().add(ignorePatterns);

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

  return {stream: fg.stream(globPatterns, { dot: false, absolute: true, ignore:
     ignorePatterns
   }),
   filter: ig.createFilter()
  };
};
