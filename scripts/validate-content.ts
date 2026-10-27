import { validateContentTree } from "../src/lib/content/validate";

const result = validateContentTree(process.cwd());
if (!result.ok) {
  console.error("Content validation failed:");
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${result.questionCount} questions and ${result.lineCount} mascot lines.`,
);
