#!/usr/bin/env node

import { ESLint } from "eslint";
import { lintWithBiome } from "./biome";
import { lintWithEslint, mergeResults, overrideConfig } from "./eslint";
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
          default: true,
          description: "Automatically fix linting errors",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Run in debug mode",
        })
        .help(),
    async (args) => {
      try {
        const { files: files_, fix, debug } = args;
        const patterns = Array.isArray(files_) ? files_ : [files_];

        const eslint = new ESLint({
          fix,
          cache: false,
          overrideConfig: overrideConfig,
        });

        const formatter = await eslint.loadFormatter("stylish");
        const eslntResults = await lintWithEslint(eslint, patterns, fix, debug);
        const biomeResults = await lintWithBiome(eslint, patterns, fix, debug);

        const resultText = await formatter.format(
          mergeResults([...biomeResults, ...eslntResults]),
        );

        console.log(resultText ? resultText : "No issues found");

        if (debug) {
          const measurements = performance.getEntriesByType("measure");
          for (const measurement of measurements) {
            console.log(`${measurement.name}: ${measurement.duration}ms`);
          }
        }
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    },
  );

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
instance.help().argv;
