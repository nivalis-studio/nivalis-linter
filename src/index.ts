#!/usr/bin/env node

import { Biome, Distribution } from "@biomejs/js-api";
import { ESLint } from "eslint";
import { biomeLintFiles } from "./biome";
import { mergeResults } from "./eslint";
import pkgJson from "../package.json" assert { type: "json" };
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const instance = yargs(hideBin(process.argv))
  .scriptName("@nivalis/linter")
  .usage("")
  .version(pkgJson.version)
  .alias("v", "version")
  .alias("h", "help")
  .showHelpOnFail(false)
  .command(
    "*",
    "Lint your code with Biome and ESLint at once",
    (args) =>
      args
        .option("fix", {
          type: "boolean",
          default: true,
          description: "Automatically fix linting errors",
        })
        .option("files", {
          type: "string",
          array: true,
          description: "Files to lint",
        })
        .help(),
    async (args) => {
      try {
        const files = args.files;
        const fix = args.fix;

        if (!files || files.length === 0) {
          throw new Error("No files provided");
        }

        const biome = await Biome.create({
          distribution: Distribution.NODE,
        });

        const eslint = new ESLint({ fix });

        // @ts-expect-error Custom patch
        const allFiles: string[] = await eslint.getFilePaths(files);

        const biomeResults = biomeLintFiles(biome, allFiles, fix);
        const eslintResults = await eslint.lintFiles(files);

        if (fix) {
          await ESLint.outputFixes(eslintResults);
        }

        const formatter = await eslint.loadFormatter("stylish");
        const resultText = formatter.format(
          mergeResults([...biomeResults, ...eslintResults])
        );

        console.log(resultText);
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    }
  );

instance.help().argv;
