import type { ReactNode } from "react";

export function ScreenHeading({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <div>
      <p className="text-base font-semibold text-gold">{kicker}</p>
      <h1 className="text-3xl font-semibold text-grove-deep">{title}</h1>
      <p className="mt-2 text-lg text-ink">{body}</p>
    </div>
  );
}

export function ExampleCard({
  children,
  className = "",
  id,
  testId,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  testId?: string;
}) {
  return (
    <div id={id} data-testid={testId} className={`scroll-mt-4 rounded-3xl border border-line bg-card p-4 ${className}`}>
      {children}
    </div>
  );
}
