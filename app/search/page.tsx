import { Search } from "@/components/Search";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <Search initialQuery={q} />;
}
