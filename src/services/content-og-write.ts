import type { AppServices } from "./contracts";
import { generateAndStoreContentOgImage } from "./og-image";

export async function generateContentOpenGraphImage(
  services: AppServices,
  row: { id: string; posterObjectKey: string | null; legacyPosterImage: string | null },
): Promise<string | undefined> {
  try {
    await generateAndStoreContentOgImage(services.objects, services.images, {
      id: row.id,
      posterObjectKey: row.posterObjectKey,
      posterImage: row.legacyPosterImage,
    });
    return undefined;
  } catch (error) {
    console.error(JSON.stringify({
      message: "Open Graph image generation failed",
      contentId: row.id,
      error: error instanceof Error ? error.message : String(error),
    }));
    return "Content was saved, but its Open Graph image could not be generated";
  }
}
