import { readFileSync } from 'node:fs';
import type { Biome, LintResult } from '@biomejs/js-api';
import type { ESLint } from 'eslint';

const getSeverity = (severity: LintResult['diagnostics'][0]['severity']) => {
  switch (severity) {
    case 'fatal': {
      return 2;
    }

    case 'error': {
      return 2;
    }

    case 'warning': {
      return 1;
    }

    case 'information': {
      return 1;
    }

    case 'hint': {
      return 1;
    }

    default: {
      return 1;
    }
  }
};

const convertBiomeResult = (
  result: LintResult,
  filePath: string,
): ESLint.LintResult => {
  const errors = result.diagnostics.filter(
    diagnostic => getSeverity(diagnostic.severity) === 2,
  );

  const warnings = result.diagnostics.filter(
    diagnostic => getSeverity(diagnostic.severity) === 1,
  );

  return {
    filePath,
    fatalErrorCount: result.diagnostics.filter(
      diagnostic => diagnostic.severity === 'fatal',
    ).length,
    errorCount: errors.length,
    warningCount: warnings.length,
    fixableErrorCount: errors.filter(diagnostic =>
      diagnostic.tags.includes('fixable'),
    ).length,
    fixableWarningCount: warnings.filter(diagnostic =>
      diagnostic.tags.includes('fixable'),
    ).length,

    usedDeprecatedRules: [],
    suppressedMessages: [],

    messages: result.diagnostics.map(diagnostic => ({
      severity: getSeverity(diagnostic.severity),
      column: diagnostic.location.span?.[0] || 0,
      line: diagnostic.location.span?.[1] || 0,
      message: diagnostic.description,
      ruleId: (diagnostic.category as string) || 'nivalis/biome',
    })),
  };
};

const biomeLintFile = (biome: Biome, filePath: string, fix = true) => {
  const initialContent = readFileSync(filePath, 'utf8');

  const formatted = biome.formatContent(initialContent, {
    filePath,
  });

  const result = biome.lintContent(formatted.content, {
    filePath,
    fixFileMode: fix ? 'SafeFixes' : undefined,
  });

  return convertBiomeResult(result, filePath);
};

export const biomeLintFiles = (biome: Biome, files: string[], fix = true) => {
  const results = [];

  for (const file of files) {
    const result = biomeLintFile(biome, file, fix);

    results.push(result);
  }

  return results;
};
