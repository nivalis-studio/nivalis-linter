#!/usr/bin/env node

import { ESLint } from "eslint";
import { lintWithBiome } from "./biome";
import { lintWithEslint, mergeResults } from "./eslint";
import pkgJson from "../package.json" assert { type: "json" };
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { performance } from "node:perf_hooks";

const instance = yargs(hideBin(process.argv))
  .scriptName("@nivalis/linter")
  .usage("$0 <files> [args]")
  .version(pkgJson.version)
  .alias("v", "version")
  .alias("h", "help")
  .showHelpOnFail(false)
  .command(
    "* <files>",
    "Lint your code with Biome and ESLint at once",
    (args) =>
      args
        .positional("files", {
          type: "string",
          description: "Files to lint",
          demandOption: true,
        })
        .option("fix", {
          type: "boolean",
          default: false,
          description: "Automatically fix linting errors",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Run in debug mode",
        })
        .option("unsafe", {
          type: "boolean",
          default: false,
          description: "Allow unsafe fixes",
        })
        .help(),
    async (args) => {
      const { files: files_, fix, debug, unsafe } = args;
      try {
        const patterns = Array.isArray(files_) ? files_ : [files_];

        const eslint = new ESLint({
          fix,
          cache: true,
          // overrideConfig: overrideConfig,
        });

        const biomeResults = await lintWithBiome(patterns, fix, debug, unsafe);

        const eslintResults = await lintWithEslint(
          eslint,
          patterns,
          fix,
          debug,
        );

        const formatter = await eslint.loadFormatter("stylish");
        const resultText = await formatter.format(
          mergeResults([...biomeResults, ...eslintResults]),
        );

        console.log(resultText ? resultText : "No issues found");

        if (debug) {
          const measurements = performance.getEntriesByType("measure");
          for (const measurement of measurements) {
            console.log(`${measurement.name}: ${measurement.duration}ms`);
          }
        }
      } catch (error) {
        if (debug) {
          console.error(error);
        } else {
          console.error(
            "An error occurred during linting:",
            (error as Error).message,
          );
          console.error("Run with --debug for more information");
        }

        process.exit(1);
      }
    },
  );

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
instance.help().argv;
