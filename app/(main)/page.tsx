import Hero from "@/components/home/hero";

export default async function Home() {
  return (
    <div className="flex flex-col gap-8 md:gap-12 lg:gap-24">
      <Hero /> 
    </div>
  );
}
