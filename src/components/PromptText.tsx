import { splitPromptBlanks } from "@/lib/game/blanks";
import { matchTypography } from "@/lib/game/typography";

/** Renders a question prompt, with each fill-in marker as an inline gap. */
export function PromptText({ text }: { text: string }) {
  const pieces = splitPromptBlanks(matchTypography(text));
  return pieces.map((piece, index) => {
    if (piece.kind === "text") return <span key={index}>{piece.text}</span>;
    return (
      <span key={index} className="prompt-blank-wrap">
        <span className="prompt-blank" data-testid="prompt-blank">
          <span className="sr-only">blank</span>
        </span>
        {piece.trailing}
      </span>
    );
  });
}
