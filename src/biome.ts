import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import type { Biome, LintResult } from "@biomejs/js-api";
import type { ESLint } from "eslint";

const getSeverity = (severity: LintResult["diagnostics"][0]["severity"]) => {
  switch (severity) {
    case "fatal": {
      return 2;
    }

    case "error": {
      return 2;
    }

    case "warning": {
      return 1;
    }

    case "information": {
      return 1;
    }

    case "hint": {
      return 1;
    }

    default: {
      return 1;
    }
  }
};

const getLineAncColFromByteOffset = (
  content: string,
  offset: number
): { line: number; column: number } => {
  const lines = content.split("\n");

  let line = 1;
  let column = 1;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;

    if (offset < lineLength) {
      column = offset + 1;
      break;
    }

    offset -= lineLength;
    line++;
  }

  return { line, column };
};

const convertBiomeResult = (
  result: LintResult,
  filePath: string,
  fileContent: string
): ESLint.LintResult => {
  const errors = result.diagnostics.filter(
    (diagnostic) => getSeverity(diagnostic.severity) === 2
  );

  const warnings = result.diagnostics.filter(
    (diagnostic) => getSeverity(diagnostic.severity) === 1
  );

  return {
    filePath,
    fatalErrorCount: result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "fatal"
    ).length,
    errorCount: errors.length,
    warningCount: warnings.length,
    fixableErrorCount: errors.filter((diagnostic) =>
      diagnostic.tags.includes("fixable")
    ).length,
    fixableWarningCount: warnings.filter((diagnostic) =>
      diagnostic.tags.includes("fixable")
    ).length,

    usedDeprecatedRules: [],
    suppressedMessages: [],

    messages: result.diagnostics.map((diagnostic) => {
      const { column, line } = getLineAncColFromByteOffset(
        fileContent,
        diagnostic.location.span?.[0] || 0
      );

      return {
        severity: getSeverity(diagnostic.severity),
        column,
        line,
        message: diagnostic.description,
        ruleId: (diagnostic.category as string) || "nivalis/biome",
      };
    }),
  };
};

const biomeLintFile = (biome: Biome, filePath: string, fix = true) => {
  const initialContent = readFileSync(filePath, "utf8");

  const formatted = biome.formatContent(initialContent, {
    filePath,
  });

  const result = biome.lintContent(formatted.content, {
    filePath,
    fixFileMode: fix ? "SafeFixes" : undefined,
  });

  return convertBiomeResult(result, filePath, result.content);
};

export const biomeLintFiles = (biome: Biome, files: string[], fix = true) => {
  const results = [];

  for (const file of files) {
    const result = biomeLintFile(biome, file, fix);

    results.push(result);
  }

  return results;
};

 const findNearestBiomeConfig = () => {
  const cwd = process.cwd();

  let currentDir = cwd;

  while (currentDir !== "/") {
    const biomeConfigPath = path.join(currentDir, "biome.json");

    if (existsSync(biomeConfigPath)) {
      return biomeConfigPath;
    }

    currentDir = path.dirname(currentDir);
  }

  return null;
};

export const getBiomeConfig = () => {
  const biomeConfigPath = findNearestBiomeConfig();

  if (!biomeConfigPath) {
    throw new Error("No biome config found");
  }

  const biomeConfig = readFileSync(biomeConfigPath, "utf8");

  return biomeConfig;
};
