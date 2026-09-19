import { Search } from "@/components/Search";
import { getRankedProductTypes } from "@/lib/products";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q, type } = await searchParams;
  // Rule 9: the types are a closed list in the database, never free text — so
  // the filter is built from that table rather than from whatever types happen
  // to appear in the current results. Ordered by how many listings each holds,
  // which is what decides the two that fit before "show more".
  const types = await getRankedProductTypes();

  return <Search initialQuery={q} initialType={type ?? null} types={types} />;
}
