/** Small story pictures for earned stage badges. The slot itself has no words. */
export function BadgeArt({ topic }: { topic: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-9 w-9" fill="none">
      {scene(topic)}
    </svg>
  );
}

function scene(topic: string) {
  switch (topic) {
    case "jonah":
      return <Fish />;
    case "creation":
      return <Creation />;
    case "noah":
      return <Ark />;
    case "moses":
      return <Staff />;
    case "david-goliath":
      return <Sling />;
    case "jesus-birth":
      return <Star />;
    case "miracles":
      return <Jar />;
    case "cross-resurrection":
      return <Cross />;
    case "john-3-16-17":
    case "greatest-commandment":
      return <Heart />;
    case "joseph":
      return <Coat />;
    case "daniel":
      return <Lion />;
    case "pentecost":
      return <Flame />;
    case "revelation":
      return <Trumpet />;
    case "ruth":
      return <Wheat />;
    case "epistles":
      return <Letter />;
    case "wisdom-books":
    case "psalm-23":
    case "psalm-1":
      return <Lamp />;
    case "ten-commandments":
      return <Tablets />;
    case "lords-prayer":
      return <Hands />;
    case "beatitudes":
      return <Mountain />;
    case "armor-of-god":
      return <Shield />;
    case "fruit-of-spirit":
      return <Fruit />;
    case "roman-road":
    case "great-commission":
      return <Road />;
    case "early-church":
    case "twelve-disciples":
      return <People />;
    case "jesus-identity":
      return <Shepherd />;
    default:
      return <Scroll />;
  }
}

const ink = { stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Fish() {
  return (
    <>
      <path d="M10 32c8-10 20-12 32-6 6 2 12 2 14 0-2 6-8 10-14 12-12 4-24 2-32-6z" fill="currentColor" opacity="0.18" {...ink} />
      <path d="M12 32 6 26v12z" fill="currentColor" />
      <circle cx="40" cy="30" r="1.7" fill="currentColor" />
    </>
  );
}

function Creation() {
  return (
    <>
      <circle cx="40" cy="18" r="7" fill="currentColor" opacity="0.25" {...ink} />
      <path d="M8 44c8-10 14-10 22 0s14 10 26 0" {...ink} />
      <path d="M8 52h48" {...ink} />
    </>
  );
}

function Ark() {
  return (
    <>
      <path d="M10 40h44l-6 10H16z" fill="currentColor" opacity="0.18" {...ink} />
      <path d="M22 40V28h20v12" {...ink} />
      <path d="M32 28v-6" {...ink} />
    </>
  );
}

function Staff() {
  return (
    <>
      <path d="M24 10c0 18 2 26 2 42" {...ink} />
      <path d="M18 16c8 4 12 4 18-2" {...ink} />
      <path d="M36 46c6 2 12 0 16-4" {...ink} />
    </>
  );
}

function Sling() {
  return (
    <>
      <path d="M16 14c10 8 14 16 14 28" {...ink} />
      <circle cx="42" cy="42" r="6" fill="currentColor" opacity="0.25" {...ink} />
    </>
  );
}

function Star() {
  return <path d="M32 10 36 24h14l-11 8 4 14-11-8-11 8 4-14-11-8h14z" fill="currentColor" opacity="0.25" {...ink} />;
}

function Jar() {
  return (
    <>
      <path d="M24 16h16M26 16c-2 8-4 14-4 22 0 8 4 12 10 12s10-4 10-12c0-8-2-14-4-22" {...ink} />
      <path d="M24 36h16" {...ink} />
    </>
  );
}

function Cross() {
  return (
    <>
      <path d="M32 12v36M22 22h20" {...ink} />
      <path d="M16 50c6-6 10-8 16-8s10 2 16 8" {...ink} />
    </>
  );
}

function Heart() {
  return <path d="M32 50 14 32c-6-8 2-18 10-14 4 2 6 6 8 8 2-2 4-6 8-8 8-4 16 6 10 14z" fill="currentColor" opacity="0.2" {...ink} />;
}

function Coat() {
  return <path d="M22 16 32 24 42 16l8 8-8 28H22L14 24z" fill="currentColor" opacity="0.18" {...ink} />;
}

function Lion() {
  return (
    <>
      <circle cx="32" cy="34" r="12" fill="currentColor" opacity="0.18" {...ink} />
      <path d="M20 26c-2-8 4-12 8-8M44 26c2-8-4-12-8-8M24 48c4 4 12 4 16 0" {...ink} />
    </>
  );
}

function Flame() {
  return <path d="M32 10c8 10 4 16 8 22 4 6-2 16-8 16s-14-8-10-18c4-2 4-8 2-12 4 4 6 4 8-8z" fill="currentColor" opacity="0.22" {...ink} />;
}

function Trumpet() {
  return (
    <>
      <path d="M14 36h22l12-8v16l-12-8" {...ink} />
      <path d="M20 36c0 8 4 12 8 12" {...ink} />
    </>
  );
}

function Wheat() {
  return (
    <>
      <path d="M32 54V16" {...ink} />
      <path d="M32 22c-8 2-10 8-8 12M32 30c8 2 10 8 8 12M32 38c-8 2-8 8-6 12" {...ink} />
    </>
  );
}

function Letter() {
  return (
    <>
      <path d="M12 18h40v28H12z" {...ink} />
      <path d="m12 18 20 16L52 18" {...ink} />
    </>
  );
}

function Lamp() {
  return (
    <>
      <path d="M26 40h12l2 8H24z" fill="currentColor" opacity="0.2" {...ink} />
      <path d="M32 40V24M24 24h16l-2-8H26z" {...ink} />
      <path d="M22 18c6-8 14-8 20 0" {...ink} />
    </>
  );
}

function Tablets() {
  return (
    <>
      <path d="M14 14h16v36H14zM34 14h16v36H34z" {...ink} />
      <path d="M18 24h8M18 32h8M38 24h8M38 32h8" {...ink} />
    </>
  );
}

function Hands() {
  return <path d="M18 36c0-8 6-14 14-14s14 6 14 14v12H18zM24 28v-6M32 26V16M40 28v-6" {...ink} />;
}

function Mountain() {
  return <path d="M8 50 24 22l10 14 6-8 16 22z" fill="currentColor" opacity="0.18" {...ink} />;
}

function Shield() {
  return <path d="M32 10 50 18v14c0 12-8 20-18 24C22 52 14 44 14 32V18z" fill="currentColor" opacity="0.18" {...ink} />;
}

function Fruit() {
  return (
    <>
      <path d="M32 18v28" {...ink} />
      <circle cx="22" cy="30" r="6" fill="currentColor" opacity="0.2" {...ink} />
      <circle cx="40" cy="36" r="6" fill="currentColor" opacity="0.2" {...ink} />
      <path d="M32 18c6-6 10-6 12-4" {...ink} />
    </>
  );
}

function Road() {
  return (
    <>
      <path d="M18 54 28 12h8L46 54" {...ink} />
      <path d="M32 20v6M32 32v6M32 44v6" {...ink} />
    </>
  );
}

function People() {
  return (
    <>
      <circle cx="22" cy="22" r="5" {...ink} />
      <circle cx="42" cy="22" r="5" {...ink} />
      <path d="M12 46c2-8 6-12 10-12s8 4 10 12M32 46c2-8 6-12 10-12s8 4 10 12" {...ink} />
    </>
  );
}

function Shepherd() {
  return (
    <>
      <circle cx="40" cy="18" r="6" {...ink} />
      <path d="M28 50c2-12 6-18 12-18s8 4 8 10" {...ink} />
      <path d="M16 46c8-2 14 0 18 6" {...ink} />
    </>
  );
}

function Scroll() {
  return (
    <>
      <path d="M16 16h28c4 0 8 4 8 8v24H20c-4 0-8-2-8-8V16z" {...ink} />
      <path d="M24 28h16M24 36h12" {...ink} />
    </>
  );
}
