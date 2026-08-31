import Link from "next/link";
import { AccordionSection } from "@/components/AccordionSection";
import { Coil } from "@/components/Coil";
import { OcrOutcome } from "@/app/contexts/ResultContext";

const GrowLine = () => (
  <p className="mt-6 text-center text-[13px] text-muted">
    Help us grow — add this product to our{" "}
    <Link href="/products" className="font-bold text-brand">
      database
    </Link>
    .
  </p>
);

const Verdict = ({
  tone,
  heading,
  blurb,
}: {
  tone: string;
  heading: string;
  blurb: string;
}) => (
  <div className="flex items-center gap-3.5">
    <Coil tone={tone} />
    <div>
      <p className="font-display text-xl font-semibold tracking-tight">
        {heading}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{blurb}</p>
    </div>
  </div>
);

export const ResultView = ({
  outcome,
}: {
  outcome: NonNullable<OcrOutcome>;
}) => {
  if (outcome.status === "error") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <p className="font-display text-2xl font-semibold tracking-tight">
          Something went wrong
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          We&apos;re not sure why. Try again, and make sure the photo shows the
          ingredients list.
        </p>
      </div>
    );
  }

  if (outcome.status === "cool") {
    return (
      <div className="mx-auto w-full max-w-md px-5 py-8">
        <Verdict
          tone="stroke-ok"
          heading="Nothing flagged"
          blurb="None of the ingredients we read are on the avoid list."
        />
        <GrowLine />
      </div>
    );
  }

  const flagged = outcome.groups.filter((g) => g[0]);
  const total = flagged.reduce((n, g) => n + g.length, 0);

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <Verdict
        tone="stroke-bad"
        heading={`${total} to avoid`}
        blurb="This product isn't compatible with the Curly Girl method."
      />

      <div className="mt-3 border-t border-line">
        {flagged.map((group, i) => (
          <AccordionSection key={i} title={group[0].type} count={group.length}>
            <ul>
              {group.map((result, item) => (
                <li key={item} className="py-2">
                  <span className="block text-[13px] font-medium capitalize">
                    {result.name}
                  </span>
                  {/* Placeholder: lib/ingredients.ts has no real descriptions yet. */}
                  <span className="block text-xs leading-relaxed text-muted">
                    Explanation coming soon.
                  </span>
                </li>
              ))}
            </ul>
          </AccordionSection>
        ))}
      </div>

      <GrowLine />
    </div>
  );
};
