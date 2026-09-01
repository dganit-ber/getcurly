import { Suspense } from "react";
import { Uploader } from "@/components/Uploader";

export default function HomePage() {
  return (
    <Suspense>
      <Uploader />
    </Suspense>
  );
}
