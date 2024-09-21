import { Biome, Distribution } from "@biomejs/js-api";
import pLimit from "p-limit";
import { readFileSync, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { performance } from "node:perf_hooks";
import type { Configuration, LintResult } from "@biomejs/js-api";
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
  offset: number,
): { line: number; column: number } => {
  const lines = content.split("\n");

  let line = 1;
  let column = 1;
  let offset_ = offset;

  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1;

    if (offset_ < lineLength) {
      column = offset_ + 1;
      break;
    }

    offset_ -= lineLength;
    line++;
  }

  return { line, column };
};

const convertBiomeResult = (
  result: LintResult,
  filePath: string,
  fileContent: string,
): ESLint.LintResult => {
  const errors = result.diagnostics.filter(
    (diagnostic) => getSeverity(diagnostic.severity) === 2,
  );

  const warnings = result.diagnostics.filter(
    (diagnostic) => getSeverity(diagnostic.severity) === 1,
  );

  return {
    filePath,
    fatalErrorCount: result.diagnostics.filter(
      (diagnostic) => diagnostic.severity === "fatal",
    ).length,
    errorCount: errors.length,
    warningCount: warnings.length,
    fixableErrorCount: errors.filter((diagnostic) =>
      diagnostic.tags.includes("fixable"),
    ).length,
    fixableWarningCount: warnings.filter((diagnostic) =>
      diagnostic.tags.includes("fixable"),
    ).length,

    usedDeprecatedRules: [],
    suppressedMessages: [],

    messages: result.diagnostics.map((diagnostic) => {
      const { column, line } = getLineAncColFromByteOffset(
        fileContent,
        diagnostic.location.span?.[0] || 0,
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

const biomeLintFile = async (biome: Biome, filePath: string, fix = true) => {
  const initialContent = await readFile(filePath, "utf8");

  const result = biome.lintContent(initialContent, {
    filePath,
    fixFileMode: fix ? "SafeFixes" : undefined,
  });

  if (fix) {
    const formatted = biome.formatContent(result.content, {
      filePath,
    });

    if (formatted.content !== result.content) {
      await writeFile(filePath, formatted.content);
    }
  }

  return convertBiomeResult(result, filePath, result.content);
};

const biomeLintFiles = async (
  biome: Biome,
  files: string[],
  fix = true,
  concurrency: number = os.cpus().length,
) => {
  const limit = pLimit(concurrency);
  const results = await Promise.all(
    files.map((file) =>
      limit(async () => await biomeLintFile(biome, file, fix)),
    ),
  );

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

const defaultConfig: Configuration = {
  $schema: "https://biomejs.dev/schemas/1.6.0/schema.json",
  organizeImports: {
    enabled: true,
  },
  linter: {
    enabled: true,
    rules: {
      all: true,
      nursery: {
        noReactSpecificProps: "off",
      },
    },
  },
  formatter: {
    enabled: true,
    indentStyle: "space",
    indentSize: 2,
    formatWithErrors: false,
    ignore: [],
    attributePosition: "auto",
    indentWidth: 2,
    lineWidth: 80,
    lineEnding: "lf",
  },
  javascript: {
    formatter: {
      quoteStyle: "single",
      arrowParentheses: "always",
      bracketSameLine: false,
      bracketSpacing: true,
      jsxQuoteStyle: "double",
      quoteProperties: "asNeeded",
      semicolons: "always",
      trailingCommas: "all",
    },
  },
  json: {
    formatter: {
      trailingCommas: "none",
    },
  },
};

const getBiomeConfig = (): Configuration => {
  try {
    let config = defaultConfig;
    const biomeConfigPath = findNearestBiomeConfig();

    if (biomeConfigPath) {
      const biomeConfig = readFileSync(biomeConfigPath, "utf8");
      config = Object.assign(config, JSON.parse(biomeConfig));
    }

    return config;
  } catch (error) {
    console.warn(error);
    return defaultConfig;
  }
};

export const lintWithBiome = async (
  files: string[],
  concurrency: number = os.cpus().length,
  fix = true,
  debug = false,
) => {
  if (debug) {
    performance.mark("biome-start");
  }

  const biome = await Biome.create({
    distribution: Distribution.NODE,
  });

  biome.applyConfiguration(getBiomeConfig());

  const biomeResults = await biomeLintFiles(biome, files, fix, concurrency);

  if (debug) {
    performance.mark("biome-end");
    performance.measure("biome", "biome-start", "biome-end");
  }

  return biomeResults;
};
