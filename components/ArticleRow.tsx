import Link from "next/link";

interface ArticleRowProps {
  kicker: string;
  title: string;
  /** Omitted until /read exists — the row still renders, it just isn't a link. */
  href?: string;
}

const ROW = "block py-3 no-underline [&+&]:border-t [&+&]:border-line";

const Body = ({ kicker, title }: { kicker: string; title: string }) => (
  <>
    <span className="text-[11px] font-bold uppercase tracking-[0.11em] text-accent">
      {kicker}
    </span>
    <b className="mt-0.75 block font-display text-base font-bold tracking-[-0.02em]">
      {title}
    </b>
  </>
);

/** An article teaser: what kind of piece it is, then its title. */
export const ArticleRow = ({ kicker, title, href }: ArticleRowProps) =>
  href ? (
    <Link href={href} className={ROW}>
      <Body kicker={kicker} title={title} />
    </Link>
  ) : (
    <div className={ROW}>
      <Body kicker={kicker} title={title} />
    </div>
  );
