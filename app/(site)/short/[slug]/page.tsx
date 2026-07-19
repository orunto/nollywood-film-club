import type { Metadata } from "next";
import { contentMetadata, resolveContent } from "@/lib/content-route";
import ContentDetailsPage from "@/components/sections/content-details-page";

interface ShortFilmPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ShortFilmPageProps): Promise<Metadata> {
  const { slug } = await params;
  return contentMetadata(await resolveContent(slug));
}

export default async function ShortFilmPage({ params }: ShortFilmPageProps) {
  const { slug } = await params;
  return <ContentDetailsPage rawParam={slug} basePath="/short" />;
}
