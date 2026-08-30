import Image from "next/image";

export default function ProfilePage() {
  return (
    <div className="flex items-center justify-center self-center pt-[55%]">
      <Image
        src="/underconstruction.jpg"
        alt="Under construction"
        width={600}
        height={400}
        className="h-auto max-w-full"
      />
    </div>
  );
}
