import { Biome, Distribution } from "@biomejs/js-api";
import { ESLint } from "eslint";
import { biomeLintFiles } from "./biome";
import { mergeResults } from "./eslint";

(async function main(
  fix: boolean = true,
  files: string[] = [],
) {
  if (files.length === 0) {
    throw new Error('No files provided');
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

  const formatter = await eslint.loadFormatter('stylish');
  const resultText = formatter.format(
    mergeResults([...biomeResults, ...eslintResults]),
  );

  console.log(resultText);
  // eslint-disable-next-line unicorn/prefer-top-level-await
})().catch(error => {
  process.exitCode = 1;
  console.error(error);
});
