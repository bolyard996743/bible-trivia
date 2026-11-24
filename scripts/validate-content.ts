import { validateDevotions } from "../src/lib/content/devotions";
import { validateContentTree } from "../src/lib/content/validate";

const result = validateContentTree(process.cwd());
const devotions = validateDevotions(process.cwd());
const errors = [...result.errors, ...devotions.errors];
if (!result.ok || !devotions.ok) {
  console.error("Content validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${result.questionCount} questions, ${result.lineCount} mascot lines, and ${devotions.entryCount} devotions.`,
);
