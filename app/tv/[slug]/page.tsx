import type { Metadata } from "next";
import { contentMetadata, resolveContent } from "@/lib/content-route";
import ContentDetailsPage from "@/components/sections/content-details-page";

interface TvPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: TvPageProps): Promise<Metadata> {
  const { slug } = await params;
  return contentMetadata(await resolveContent(slug));
}

export default async function TvPage({ params }: TvPageProps) {
  const { slug } = await params;
  return <ContentDetailsPage rawParam={slug} basePath="/tv" />;
}
