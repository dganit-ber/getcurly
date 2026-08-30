import Image from "next/image";

export default function AboutMePage() {
  return (
    <div className="flex flex-col items-center">
      <p className="font-title text-[50px]">About Me</p>
      <div className="flex bg-lavender">
        <Image
          src="/mememe.jpg"
          alt="Dganit"
          width={300}
          height={400}
          className="mt-7.5 h-100 w-auto pl-7.5"
        />
        <p className="px-7.5 font-sans text-[25px]">
          Hi there! My name is Dganit, an Israeli who lives in Berlin, Germany, for the past
          decade. I have curly hair, which I have been strugling with for years. <br />
          When I discovered &quot;Curly Girl&quot;, this finally changed and I could finally
          enjoy my hair and not battle with it. However, I was still struggling with reading
          labels and understanding the ingredients list.
          <br />I was praying someone would just create a magic trick which will make things
          easier for me. When I started learning Web Development, It was obvious to me that
          now, when I have the tools and knowledge, I am the person who will build this tool.
          As my graduation project from{" "}
          <a href="https://www.spiced-academy.com/">&quot;Spiced Academy&quot;</a> during
          February of 2020, I built this website, in hope that it would beome a useful tool
          for me and other curlies.
        </p>
      </div>
    </div>
  );
}
