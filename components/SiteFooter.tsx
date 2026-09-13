import { copy } from "@/lib/copy";

/** Rule 12: the promise sits in the footer, in these words. */
export const SiteFooter = () => (
  <footer className="bg-surface-2 px-4.5 pb-7 pt-5.5">
    <p className="mb-2 text-[12.5px] text-ink-soft">
      {copy.affiliate.footerPromise}
    </p>
    <p className="text-xs text-ink-faint">{copy.footer.links}</p>
  </footer>
);
