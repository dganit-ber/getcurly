import { WaveDivider } from "@/components/WaveDivider";

/** A page section, separated from the one above it by a wave rather than a rule. */
export const Section = ({ children }: { children: React.ReactNode }) => (
  <section>
    <WaveDivider />
    <div className="px-4.5 py-5">{children}</div>
  </section>
);
