interface TextFieldProps {
  name: string;
  label: string;
  value: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const TextField = ({
  name,
  label,
  value,
  error,
  onChange,
}: TextFieldProps) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={name} className="text-xs text-muted">
      {label}
    </label>
    <input
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-ink outline-none focus:border-brand"
    />
    {error && <p className="text-xs text-bad">{error}</p>}
  </div>
);
