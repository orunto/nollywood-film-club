"use client"

import { MovieOfTheWeek, PastSpaces, Reviews } from "@/components/sections";


export default function Home() {


  return <main className="w-full flex flex-col lg:px-10 lg:py-8 py-10 px-6 gap-15">
    <MovieOfTheWeek />
    <PastSpaces />
    <Reviews />
  </main>
}
