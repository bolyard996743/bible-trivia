const PIECES: { x: string; y: string; r: string; color: string }[] = [
  { x: "-54px", y: "-64px", r: "28deg", color: "#1a7a42" },
  { x: "-24px", y: "-78px", r: "-18deg", color: "#c45c26" },
  { x: "8px", y: "-84px", r: "14deg", color: "#f6d48a" },
  { x: "36px", y: "-70px", r: "36deg", color: "#1a7a42" },
  { x: "58px", y: "-40px", r: "-24deg", color: "#7a4e0c" },
  { x: "-64px", y: "-28px", r: "18deg", color: "#f6d48a" },
  { x: "18px", y: "-46px", r: "-12deg", color: "#c45c26" },
  { x: "-36px", y: "-42px", r: "42deg", color: "#7a4e0c" },
  { x: "46px", y: "-18px", r: "20deg", color: "#1a7a42" },
  { x: "-10px", y: "-58px", r: "-30deg", color: "#f6d48a" },
  { x: "28px", y: "-24px", r: "16deg", color: "#c45c26" },
  { x: "-48px", y: "-52px", r: "-8deg", color: "#7a4e0c" },
];

/** A short burst. Reduced motion hides it in CSS, with no extra library. */
export function ConfettiBurst() {
  return (
    <div className="confetti" data-testid="confetti" aria-hidden="true">
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={{
            ["--x" as string]: piece.x,
            ["--y" as string]: piece.y,
            ["--r" as string]: piece.r,
            background: piece.color,
            animationDelay: `${index * 18}ms`,
          }}
        />
      ))}
    </div>
  );
}
