import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 p-10 text-center">
      <h1 className="font-title text-[50px]">Page not found</h1>
      <Link href="/" className="font-sans text-[20px] underline">
        Back to Get Curly
      </Link>
    </div>
  );
}
