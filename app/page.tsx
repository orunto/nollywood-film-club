import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge, DownloadIcon, Mic, PlayIcon } from "lucide-react";

export default function Home() {
  return <main className="w-full flex flex-col lg:p-10 px-6">
    <section className="w-full">
      <h1 className="pb-3 border-b border-black text-2xl font-semibold">Movie of the Week</h1>
      <div className=" grid grid-cols-6 gap-10 py-6">
        <figure className="col-span-4 flex flex-col gap-4">
          <Image src="/assets/webp/elj.webp" alt="Hero" width={500} height={500} className="w-full h-90 rounded-lg bg-black object-contain" />
        </figure>
        <div className="col-span-2 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-medium">Everybody Loves Jenifa</h2>
            <span className="text-xs font-light">Run Time: 1h 30min</span>
            <span className="text-xs font-light">Theatrical Release Date: 2000</span>
            <span className="text-xs font-light">Genre: Comedy</span>
          </div>

          <div className="flex flex-col gap-1">
            <header className="text-lg font-medium">
              Synopsis
            </header>

            <p className="text-sm font-light">
              Jenifa&apos;s popularity fades when a shady new neighbor, Lobster, outshines her charity work. In Ghana, Jenifa and friends face a deadly drug baron after a bag of drugs is mistakenly left in their rental.
            </p>
          </div>

          <div className="w-full pt-2 grid grid-cols-2 items-center gap-2">
            <Button variant={'secondary'} className="w-full bg-red-500 text-white">
              <PlayIcon className="w-4 h-4" />
              Stream on Netflix
            </Button>
            <Button variant={'outline'} className="w-full bg-black text-white">
              <Mic className="w-4 h-4" />
              Join the Space
            </Button>
          </div>
        </div>

      </div>
    </section>
  </main>
}
