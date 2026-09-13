import { Suspense } from "react";
import { Uploader } from "@/components/Uploader";

export default function ScanPage() {
  return (
    <Suspense>
      <Uploader />
    </Suspense>
  );
}
