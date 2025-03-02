import { Biome, Distribution } from "@biomejs/js-api";
import type { LintResult as BiomeLintResult } from "@biomejs/js-api";
import { readFileSync, existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import type {
  Configuration,
  LintResult as ESLintLintResult,
} from "@biomejs/js-api";
import type { ESLint } from "eslint";
import { getFilesToLint } from "./files";

const getSeverity = (
  severity: ESLintLintResult["diagnostics"][0]["severity"]
) => {
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
  let offset_ = offset;

  for (const lineIter of lines) {
    const lineLength = lineIter.length + 1;

    if (offset_ < lineLength) {
      column = offset_ + 1;
      break;
    }

    offset_ -= lineLength;
    line++;
  }

  return { line, column };
};

const getEmptyLintResult = (filePath: string): ESLint.LintResult =>
  ({
    filePath,
    fatalErrorCount: 0,
    errorCount: 0,
    warningCount: 0,
    fixableErrorCount: 0,
    fixableWarningCount: 0,
    usedDeprecatedRules: [],
    suppressedMessages: [],
    messages: [],
  } satisfies ESLint.LintResult);

const convertBiomeResult = (
  result: ESLintLintResult,
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

const biomeLintFile = async (
  biome: Biome,
  config: Configuration,
  filePath: string,
  fix: boolean,
  unsafe: boolean
) => {
  const shouldLint = config.linter?.enabled ?? true;

  if (!shouldLint && !fix) {
    return getEmptyLintResult(filePath);
  }

  const initialContent = await readFile(filePath, "utf8");

  let result: BiomeLintResult = {
    content: initialContent,
    diagnostics: [],
  };

  if (shouldLint) {
    result = biome.lintContent(initialContent, {
      filePath,
      fixFileMode: fix
        ? unsafe
          ? "SafeAndUnsafeFixes"
          : "SafeFixes"
        : undefined,
    });
  }

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
  $schema: "https://biomejs.dev/schemas/1.9.0/schema.json",
  organizeImports: {
    enabled: true,
  },
  formatter: {
    enabled: true,
    // useEditorconfig: true,
    formatWithErrors: false,
    indentStyle: "space",
    indentWidth: 2,
    lineEnding: "lf",
    lineWidth: 80,
    attributePosition: "auto",
    // bracketSpacing: true,
    ignore: [
      "**/node_modules",
      "**/.next",
      "**/.turbo",
      "**/.swc",
      "**/build",
      "public/build",
      "**/CODEOWNERS",
      "**/dist",
      "**/target",
      "**/compiled",
      "**/pnpm-lock.yaml",
      "**/.env",
      "**/.gitignore",
    ],
  },
  linter: {
    rules: {
      recommended: true,
      a11y: {
        noAccessKey: "warn",
        noAriaUnsupportedElements: "warn",
        noAutofocus: "warn",
        noBlankTarget: "error",
        noDistractingElements: "warn",
        noHeaderScope: "warn",
        noInteractiveElementToNoninteractiveRole: "warn",
        // noLabelWithoutControl: "warn",
        noNoninteractiveElementToInteractiveRole: "warn",
        noNoninteractiveTabindex: "warn",
        noPositiveTabindex: "warn",
        noRedundantAlt: "warn",
        noRedundantRoles: "warn",
        useAltText: "warn",
        useAnchorContent: "warn",
        useAriaActivedescendantWithTabindex: "warn",
        useAriaPropsForRole: "warn",
        useButtonType: "error",
        // useFocusableInteractive: "warn",
        useHeadingContent: "warn",
        useHtmlLang: "warn",
        useIframeTitle: "warn",
        useKeyWithClickEvents: "warn",
        useKeyWithMouseEvents: "warn",
        useMediaCaption: "warn",
        useValidAnchor: "warn",
        useValidAriaProps: "warn",
        useValidAriaRole: {
          level: "warn",
          options: { allowInvalidRoles: [], ignoreNonDom: false },
        },
        useValidAriaValues: "warn",
        useValidLang: "warn",
      },
      complexity: {
        noExcessiveCognitiveComplexity: "error",
        noExtraBooleanCast: "error",
        noForEach: "error",
        noMultipleSpacesInRegularExpressionLiterals: "error",
        noStaticOnlyClass: "warn",
        noUselessCatch: "error",
        noUselessConstructor: "error",
        noUselessEmptyExport: "error",
        noUselessFragments: "error",
        noUselessLabel: "error",
        noUselessLoneBlockStatements: "error",
        noUselessRename: "error",
        // noUselessStringConcat: "error",
        noUselessSwitchCase: "error",
        noUselessTernary: "error",
        noUselessThisAlias: "error",
        noUselessTypeConstraint: "error",
        // noUselessUndefinedInitialization: "error",
        noVoid: "error",
        noWith: "error",
        useArrowFunction: "off",
        // useDateNow: "error",
        useFlatMap: "error",
        useLiteralKeys: "error",
        useOptionalChain: "error",
        useRegexLiterals: "error",
      },
      correctness: {
        noChildrenProp: "error",
        noConstAssign: "off",
        noConstantCondition: "error",
        noConstructorReturn: "error",
        noEmptyCharacterClassInRegex: "off",
        noEmptyPattern: "error",
        noGlobalObjectCalls: "off",
        noInnerDeclarations: "error",
        // noInvalidBuiltinInstantiation: "error",
        noInvalidConstructorSuper: "off",
        noInvalidUseBeforeDeclaration: "error",
        noNewSymbol: "off",
        noNonoctalDecimalEscape: "error",
        noPrecisionLoss: "off",
        noSelfAssign: "error",
        noSetterReturn: "off",
        noSwitchDeclarations: "error",
        noUndeclaredVariables: "off",
        noUnreachable: "off",
        noUnreachableSuper: "off",
        noUnsafeFinally: "error",
        noUnsafeOptionalChaining: "error",
        noUnusedLabels: "error",
        noUnusedPrivateClassMembers: "error",
        noUnusedVariables: "error",
        noVoidElementsWithChildren: "error",
        useArrayLiterals: "off",
        useExhaustiveDependencies: "warn",
        useHookAtTopLevel: "error",
        useIsNan: "error",
        useJsxKeyInIterable: "error",
        useValidForDirection: "error",
        useYield: "error",
      },
      security: {
        noDangerouslySetInnerHtml: "error",
        noDangerouslySetInnerHtmlWithChildren: "error",
        noGlobalEval: "error",
      },
      style: {
        noArguments: "error",
        noCommaOperator: "error",
        noDefaultExport: "off",
        noImplicitBoolean: "error",
        noInferrableTypes: "error",
        noNamespace: "error",
        noNegationElse: "off",
        noNonNullAssertion: "error",
        noParameterAssign: "error",
        noParameterProperties: "error",
        noRestrictedGlobals: {
          level: "error",
          options: {
            deniedGlobals: ["global", "self", "isFinite", "isNaN"],
          },
        },
        noUselessElse: "error",
        noVar: "error",
        // noYodaExpression: "error",
        useAsConstAssertion: "error",
        useBlockStatements: "off",
        useCollapsedElseIf: "error",
        useConsistentArrayType: {
          level: "error",
          options: { syntax: "shorthand" },
        },
        // useConsistentBuiltinInstantiation: "error",
        useConst: "warn",
        useDefaultParameterLast: "error",
        // useDefaultSwitchClause: "error",
        // useExplicitLengthCheck: "error",
        useExponentiationOperator: "error",
        useExportType: "error",
        useFilenamingConvention: {
          level: "warn",
          options: {
            strictCase: true,
            requireAscii: true,
            filenameCases: ["kebab-case", "PascalCase"],
          },
        },
        useForOf: "error",
        useFragmentSyntax: "error",
        useImportType: "error",
        useLiteralEnumMembers: "error",
        useNamingConvention: {
          level: "warn",
          options: {
            requireAscii: false,
            enumMemberCase: "PascalCase",
            strictCase: false,
            conventions: [
              {
                selector: {
                  kind: "function",
                  modifiers: [
                    "abstract",
                    "private",
                    "protected",
                    "readonly",
                    "static",
                  ],
                  scope: "any",
                },
                formats: ["camelCase", "PascalCase"],
              },
            ],
          },
        },
        useNodejsImportProtocol: "error",
        useNumberNamespace: "error",
        useNumericLiterals: "error",
        useShorthandAssign: "error",
        useShorthandFunctionType: "error",
        useSingleVarDeclarator: "error",
        useTemplate: "error",
        // useThrowNewError: "error",
        // useThrowOnlyError: "error",
        useWhile: "error",
      },
      suspicious: {
        noArrayIndexKey: "error",
        noAssignInExpressions: "error",
        noAsyncPromiseExecutor: "error",
        noCatchAssign: "error",
        noClassAssign: "error",
        noCommentText: "error",
        noCompareNegZero: "error",
        noConfusingLabels: "error",
        noConfusingVoidType: "error",
        // options: { allow: ["warn", "error"] },
        noConsoleLog: "warn",
        noControlCharactersInRegex: "error",
        noDebugger: "warn",
        noDoubleEquals: "error",
        noDuplicateCase: "error",
        noDuplicateClassMembers: "error",
        noDuplicateJsxProps: "error",
        noDuplicateObjectKeys: "off",
        noDuplicateParameters: "off",
        noEmptyBlockStatements: "error",
        noExplicitAny: "warn",
        noExtraNonNullAssertion: "error",
        noFallthroughSwitchClause: "warn",
        noFunctionAssign: "off",
        noGlobalAssign: "error",
        noImportAssign: "off",
        noLabelVar: "error",
        noMisleadingCharacterClass: "error",
        noMisleadingInstantiator: "error",
        noPrototypeBuiltins: "error",
        noRedeclare: "error",
        noSelfCompare: "error",
        noShadowRestrictedNames: "error",
        noSparseArray: "error",
        noThenProperty: "error",
        noUnsafeDeclarationMerging: "error",
        noUnsafeNegation: "off",
        useAwait: "error",
        useDefaultSwitchClauseLast: "error",
        // useErrorMessage: "error",
        useGetterReturn: "off",
        useNamespaceKeyword: "error",
        // useNumberToFixedDigitsArgument: "error",
        useValidTypeof: "error",
      },
    },
  },
  javascript: {
    formatter: {
      jsxQuoteStyle: "single",
      quoteProperties: "preserve",
      trailingCommas: "all",
      semicolons: "always",
      arrowParentheses: "asNeeded",
      bracketSameLine: false,
      quoteStyle: "single",
      attributePosition: "auto",
      bracketSpacing: true,
    },
    globals: [
      "onscrollend",
      "onpointerleave",
      "oncontextrestored",
      "onemptied",
      "ongamepaddisconnected",
      "onkeypress",
      "onloadeddata",
      "onmouseup",
      "onvolumechange",
      "onpaste",
      "onstorage",
      "onkeyup",
      "onabort",
      "oncut",
      "ontransitionrun",
      "onafterprint",
      "onblur",
      "ondurationchange",
      "ontransitionstart",
      "oncanplaythrough",
      "onanimationend",
      "onmouseleave",
      "ondragleave",
      "onplay",
      "onunhandledrejection",
      "onbeforeprint",
      "onpointercancel",
      "onsubmit",
      "ondragstart",
      "onmessage",
      "location",
      "onoffline",
      "onappinstalled",
      "onwheel",
      "onended",
      "onkeydown",
      "onclick",
      "onfocus",
      "onscroll",
      "ongamepadconnected",
      "oncanplay",
      "onpointerdown",
      "ondeviceorientationabsolute",
      "onauxclick",
      "ondevicemotion",
      "onratechange",
      "ontransitionend",
      "onscrollsnapchanging",
      "onchange",
      "onselect",
      "onbeforeinstallprompt",
      "onbeforetoggle",
      "onmouseout",
      "ontimeupdate",
      "ondragover",
      "oncuechange",
      "ontransitioncancel",
      "onprogress",
      "onbeforeinput",
      "onpointerenter",
      "onmouseenter",
      "oninvalid",
      "onpointerout",
      "onpagereveal",
      "onpause",
      "onanimationstart",
      "onwaiting",
      "onscrollsnapchange",
      "ondeviceorientation",
      "onclose",
      "onbeforeunload",
      "oncancel",
      "onseeked",
      "onpointerover",
      "ongotpointercapture",
      "onloadedmetadata",
      "onpageshow",
      "onstalled",
      "oncontextmenu",
      "onreset",
      "ondrag",
      "onbeforematch",
      "onload",
      "onlostpointercapture",
      "onsuspend",
      "onselectionchange",
      "onpagehide",
      "onrejectionhandled",
      "onunload",
      "onanimationcancel",
      "onmousedown",
      "onpointerup",
      "onmouseover",
      "onformdata",
      "oncontentvisibilityautostatechange",
      "onresize",
      "onsearch",
      "ontoggle",
      "exports",
      "onpageswap",
      "onbeforexrselect",
      "onlanguagechange",
      "ondragenter",
      "onerror",
      "onpointermove",
      "onmousemove",
      "ondrop",
      "onhashchange",
      "onsecuritypolicyviolation",
      "onslotchange",
      "oncopy",
      "onanimationiteration",
      "ondblclick",
      "ondragend",
      "onpointerrawupdate",
      "onpopstate",
      "onplaying",
      "oncontextlost",
      "onloadstart",
      "onseeking",
      "oninput",
      "onmessageerror",
      "onselectstart",
      "onmousewheel",
      "ononline",
    ],
  },
  overrides: [
    {
      include: ["**/*.json"],
      javascript: { formatter: { trailingCommas: "none" } },
      formatter: { indentStyle: "space" },
    },
    {
      include: ["**/*.yml", "**/*.yaml"],
      javascript: { formatter: { quoteStyle: "double" } },
      formatter: { indentStyle: "space" },
    },
  ],
} satisfies Configuration;

export const getBiomeConfig = (): Configuration => {
  try {
    let config = defaultConfig;
    const biomeConfigPath = findNearestBiomeConfig();

    if (biomeConfigPath) {
      const biomeConfig = readFileSync(biomeConfigPath, "utf8");
      config = JSON.parse(biomeConfig);
    }

    return config;
  } catch (error) {
    console.warn(error);
    return defaultConfig;
  }
};

export const lintWithBiome = async (
  patterns: string[],
  fix: boolean,
  debug: boolean,
  unsafe: boolean
) => {
  const [biome, config] = await Promise.all([
    Biome.create({
      distribution: Distribution.NODE,
    }),
    getBiomeConfig(),
  ]);

  biome.applyConfiguration(config);

  if (debug) {
    performance.mark("biome-start");
  }

  const files = await getFilesToLint(patterns);

  const biomeResults: ESLint.LintResult[] = await Promise.all(
    files.map(
      async (file) => await biomeLintFile(biome, config, file, fix, unsafe)
    )
  );

  if (debug) {
    performance.mark("biome-end");
    performance.measure("biome", "biome-start", "biome-end");
  }

  return biomeResults;
};
