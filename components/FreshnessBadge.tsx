import { freshnessOf, verifiedLabel } from "@/lib/freshness";

export const FreshnessBadge = ({
  verifiedAt,
}: {
  verifiedAt: string | null;
}) => {
  const state = freshnessOf(verifiedAt);

  if (state === "fresh") {
    return (
      <span className="text-[11px] text-muted">
        {verifiedLabel(verifiedAt)}
      </span>
    );
  }

  return (
    <span className="text-[11px] text-muted">
      {state === "stale" ? verifiedLabel(verifiedAt) : "Unverified"} — scan the
      label to be sure
    </span>
  );
};
