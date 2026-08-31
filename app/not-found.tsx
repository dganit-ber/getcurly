import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <Link href="/" className="mt-3 inline-block text-sm font-bold text-brand">
        Back to Get Curly
      </Link>
    </div>
  );
}
