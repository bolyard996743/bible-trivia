import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

export default async function MockupIndex({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (value?.[0]) query.set(key, value[0]);
  }
  const text = query.toString();
  redirect(text ? `/mockup/home?${text}` : "/mockup/home");
}
