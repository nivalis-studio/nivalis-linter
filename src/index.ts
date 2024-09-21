#!/usr/bin/env node

import { Biome, Distribution } from "@biomejs/js-api";
import { ESLint } from "eslint";
import { biomeLintFiles, getBiomeConfig } from "./biome";
import { mergeResults, overrideConfig } from "./eslint";
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
        .option("only", {
          choices: ["eslint"],
          description: "Only run ESLint",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          description: "Run in debug mode",
        })
        .help(),
    async (args) => {
      try {
        const { files: files_, fix, only, debug } = args;
        const files = Array.isArray(files_) ? files_ : [files_];
        const eslintOnly = only === "eslint";

        if (files.length === 0) {
          throw new Error("No files provided");
        }

        const eslint = new ESLint({
          fix,
          stats: debug,
          cache: true,
          overrideConfig: eslintOnly ? [] : overrideConfig,
        });

        if (debug) {
          performance.mark("eslint-start");
        }
        const eslintResults = await eslint.lintFiles(files);

        if (debug) {
          performance.mark("eslint-end");
          performance.measure("eslint", "eslint-start", "eslint-end");
        }

        if (fix && eslintResults.length > 0) {
          await ESLint.outputFixes(eslintResults);
        }

        const formatter = await eslint.loadFormatter("stylish");

        if (eslintOnly) {
          console.warn("Running only ESLint");
          const resultText = await formatter.format(eslintResults);

          console.log(resultText ? resultText : "No issues found");

          return;
        }

        const allFiles: string[] = eslintResults.map(
          (result) => result.filePath,
        );

        const biome = await Biome.create({
          distribution: Distribution.NODE,
        });

        biome.applyConfiguration(getBiomeConfig());

        if (debug) {
          performance.mark("biome-start");
        }

        const biomeResults = biomeLintFiles(biome, allFiles, fix);

        if (debug) {
          performance.mark("biome-end");
          performance.measure("biome", "biome-start", "biome-end");
        }

        const resultText = await formatter.format(
          mergeResults([...biomeResults, ...eslintResults]),
        );

        if (debug) {
          const measurements = performance.getEntriesByType("measure");
          for (const measurement of measurements) {
            console.log(`${measurement.name}: ${measurement.duration}ms`);
          }
        }

        console.log(resultText ? resultText : "No issues found");
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    },
  );

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
instance.help().argv;
