export const RescanBanner = ({ name }: { name: string | null }) => (
  <div className="mb-4 rounded-2xl border border-line bg-sunk px-3.5 py-3">
    <p className="text-xs text-muted">Checking</p>
    <p className="mt-0.5 font-display text-base font-semibold tracking-tight">
      {name ?? "this product"}
    </p>
    <p className="mt-1.5 text-[13px] text-muted">
      Photograph the ingredients on the bottle in your hand. What you scan is
      recorded against this product.
    </p>
  </div>
);
