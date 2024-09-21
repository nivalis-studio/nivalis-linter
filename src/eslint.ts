import type { ESLint } from "eslint";

export const mergeResults = (
  results: ESLint.LintResult[],
): ESLint.LintResult[] => {
  const mergedResults: ESLint.LintResult[] = [];

  for (const result of results) {
    const prev = mergedResults.find((res) => res.filePath === result.filePath);

    if (!prev) {
      mergedResults.push(result);

      continue;
    }

    mergedResults[mergedResults.indexOf(prev)] = {
      fatalErrorCount: prev.fatalErrorCount + result.fatalErrorCount,
      errorCount: prev.errorCount + result.errorCount,
      warningCount: prev.warningCount + result.warningCount,
      fixableErrorCount: prev.fixableErrorCount + result.fixableErrorCount,
      fixableWarningCount:
        prev.fixableWarningCount + result.fixableWarningCount,
      filePath: prev.filePath,
      suppressedMessages: [
        ...prev.suppressedMessages,
        ...result.suppressedMessages,
      ],
      messages: [...prev.messages, ...result.messages],
      usedDeprecatedRules: [
        ...prev.usedDeprecatedRules,
        ...result.usedDeprecatedRules,
      ],

      output: result.output ?? prev.output,
      source: result.source ?? prev.source,
      stats: result.stats ?? prev.stats,
    };
  }

  return mergedResults;
};
