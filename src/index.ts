#!/usr/bin/env node

import { Biome, Distribution } from "@biomejs/js-api";
import { ESLint } from "eslint";
import { biomeLintFiles, getBiomeConfig } from "./biome";
import { mergeResults, overrideConfig } from "./eslint";
import pkgJson from "../package.json" assert { type: "json" };
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

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
        const files = [files_];

        if (files.length === 0) {
          throw new Error("No files provided");
        }

        const eslint = new ESLint({
          fix,
          stats: debug,
          cache: true,
          overrideConfig,
        });

        const eslintResults = await eslint.lintFiles(files);

        if (fix && eslintResults.length > 0) {
          await ESLint.outputFixes(eslintResults);
        }

        const formatter = await eslint.loadFormatter("stylish");

        if (only === "eslint") {
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

        const biomeResults = biomeLintFiles(biome, allFiles, fix, debug);

        const resultText = await formatter.format(
          mergeResults([...biomeResults, ...eslintResults]),
        );

        console.log(resultText ? resultText : "No issues found");
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    },
  );

// eslint-disable-next-line @typescript-eslint/no-unused-expressions
instance.help().argv;
