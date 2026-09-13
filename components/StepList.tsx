/** Numbered steps. It is a real sequence, so it is an ordered list. */
export const StepList = ({
  steps,
}: {
  steps: readonly { readonly title: string; readonly body: string }[];
}) => (
  <ol className="flex list-none flex-col gap-3.5 p-0">
    {steps.map((step, i) => (
      <li key={step.title} className="grid grid-cols-[27px_1fr] gap-3">
        <span className="grid h-6.75 w-6.75 place-items-center rounded-full bg-accent-bg font-display text-[13px] font-bold text-accent">
          {i + 1}
        </span>
        <div>
          <b className="block text-sm font-bold">{step.title}</b>
          <small className="text-[13px] leading-relaxed text-ink-soft">
            {step.body}
          </small>
        </div>
      </li>
    ))}
  </ol>
);
