#!/usr/bin/env node

import { ESLint } from "eslint";
import { getFilesToLint } from "./files";
import { lintWithBiome } from "./biome";
import { lintWithEslint, mergeResults, overrideConfig } from "./eslint";
import pkgJson from "../package.json" assert { type: "json" };
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { performance } from "node:perf_hooks";
import os from "node:os";

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
        .option("concurrency", {
          type: "number",
          default: os.cpus().length,
          description:
            "Number of concurrent linting processes (default: number of CPU cores)",
        })
        .help(),
    async (args) => {
      try {
        const { files: files_, fix, debug, concurrency } = args;
        const patterns = Array.isArray(files_) ? files_ : [files_];

        const eslint = new ESLint({
          fix,
          cache: true,
          overrideConfig: overrideConfig,
        });

        const formatter = await eslint.loadFormatter("stylish");
        const files = await getFilesToLint(eslint, patterns, concurrency);

        const [eslntResults, biomeResults] = await Promise.all([
          lintWithEslint(eslint, files, concurrency, fix, debug),
          lintWithBiome(files, concurrency, fix, debug),
        ]);

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
