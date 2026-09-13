import { Barcode, ScanText } from "lucide-react";
import { ArticleRow } from "@/components/ArticleRow";
import { GroupChip } from "@/components/GroupChip";
import { ScanCta } from "@/components/ScanCta";
import { SearchRow } from "@/components/SearchRow";
import { Section } from "@/components/Section";
import { SectionLabel } from "@/components/SectionLabel";
import { SiteFooter } from "@/components/SiteFooter";
import { SoftBox } from "@/components/SoftBox";
import { StatTile } from "@/components/StatTile";
import { StepList } from "@/components/StepList";
import { copy } from "@/lib/copy";
import { getLibraryCounts } from "@/lib/library";

// The counts are pulled live, but they move slowly — hourly is fresh enough
// and keeps the front door off the database on every request.
export const revalidate = 3600;

const RULED_OUT = [
  copy.groups.sulfate,
  copy.groups.silicone,
  copy.groups.drying_alcohol,
  copy.groups.mineral_oil,
  copy.groups.wax,
];

const ARTICLES = [
  { kicker: "Ingredients", title: "Not every silicone is a problem" },
  { kicker: "Skills", title: "Read an ingredients list in thirty seconds" },
  { kicker: "From our data", title: "The most-skipped shampoos this month" },
];

export default async function HomePage() {
  const counts = await getLibraryCounts();

  return (
    <div className="w-full max-w-md">
      <div className="px-4.5 pb-5 pt-1.5">
        <SectionLabel>{copy.home.kicker}</SectionLabel>
        <h1 className="mb-2.75 font-display text-[31px] font-extrabold leading-[1.06] tracking-[-0.03em]">
          {copy.home.h1}
        </h1>
        <p className="mb-3.5 text-ink">{copy.home.lede}</p>

        <div className="flex flex-col gap-2.25">
          <ScanCta
            href="/scan?mode=barcode"
            title={copy.home.scanBarcode}
            sub={copy.home.scanBarcodeSub}
            icon={Barcode}
          />
          <ScanCta
            href="/scan"
            title={copy.home.scanLabel}
            sub={copy.home.scanLabelSub}
            icon={ScanText}
            variant="plain"
          />
        </div>

        <SearchRow placeholder={copy.home.searchPlaceholder} />
        <p className="mt-3 text-center text-xs text-ink-faint">
          {copy.home.privacy}
        </p>
      </div>

      <Section>
        <SoftBox title={copy.home.whyTwoWaysTitle} tone="caution">
          {copy.home.whyTwoWays}
        </SoftBox>
      </Section>

      <Section>
        <SectionLabel>{copy.home.rulesOutLabel}</SectionLabel>
        <div className="flex flex-wrap gap-1.75">
          {RULED_OUT.map((label) => (
            <GroupChip key={label} label={label} />
          ))}
          <GroupChip label={`${copy.groups.cg_safe} · looked for`} tone="ok" />
        </div>
      </Section>

      <Section>
        <SectionLabel>{copy.home.howItGoesLabel}</SectionLabel>
        <StepList steps={copy.home.howItGoes} />
      </Section>

      {counts && (
        <Section>
          <SectionLabel>{copy.home.countsLabel}</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              value={counts.withBarcode}
              label={copy.home.countWithBarcode}
            />
            <StatTile
              value={counts.confirmed}
              label={copy.home.countConfirmed}
              tone="ok"
            />
          </div>
          <p className="mt-3.25 text-[13px] text-ink-soft">
            {copy.home.countsNote}
          </p>
        </Section>
      )}

      <Section>
        <SectionLabel>{copy.home.readUp}</SectionLabel>
        {ARTICLES.map((article) => (
          <ArticleRow
            key={article.title}
            kicker={article.kicker}
            title={article.title}
          />
        ))}
      </Section>

      <SiteFooter />
    </div>
  );
}
