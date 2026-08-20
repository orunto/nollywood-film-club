import type { Route } from "./+types/api.admin.justwatch";
import { appServicesContext } from "../context";
import { requireAdmin } from "../admin-auth";
import { fetchJustWatchImage } from "../../services/remote-image";
import { catalogPosterIdentity } from "../../lib/media";

const JUSTWATCH_GRAPHQL_URL = "https://apis.justwatch.com/graphql";
const SEARCH_QUERY = `query GetSearchTitles($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) { popularTitles(country: $country, filter: $filter, first: $first) { edges { node { id objectType content(country: $country, language: $language) { title originalReleaseYear originalReleaseDate runtime shortDescription genres { shortName } posterUrl ageCertification clips { externalId provider } credits { role name characterName } } offers(country: $country, platform: WEB) { monetizationType standardWebURL package { clearName technicalName } } } } } }`;
const GENRE_NAMES: Record<string, string> = { act: "Action", ani: "Animation", cmy: "Comedy", crm: "Crime", doc: "Documentary", drm: "Drama", eur: "European", fml: "Family", fnt: "Fantasy", hrr: "Horror", hst: "History", msc: "Music", rly: "Reality TV", rma: "Romance", scf: "Sci-Fi", spt: "Sport", trl: "Thriller", war: "War", wsn: "Western" };
const VALID_RATINGS = new Set(["G", "PG", "PG-13", "R", "NC-17", "TV-Y", "TV-Y7", "TV-G", "TV-PG", "TV-14", "TV-MA"]);
const PLATFORM_BY_NAME: Record<string, string> = { netflix: "netflix", amazonprime: "prime_video", amazonprimevideo: "prime_video", disneyplus: "disney_plus", hulu: "hulu", hbomax: "hbo_max", max: "hbo_max", appletvplus: "apple_tv", appletv: "apple_tv", itunes: "apple_tv", paramountplus: "paramount_plus", peacock: "peacock", peacocktv: "peacock" };
const OFFER_PRIORITY = ["FLATRATE", "FREE", "ADS", "RENT", "BUY"];
const GRAPHQL_TIMEOUT_MS = 8_000;

type Offer = { monetizationType: string; standardWebURL: string | null; package: { clearName: string; technicalName: string } | null };
type Node = { id: string; objectType: string; content: { title: string; originalReleaseYear: number | null; originalReleaseDate: string | null; runtime: number | null; shortDescription: string | null; genres: { shortName: string }[] | null; posterUrl: string | null; ageCertification: string | null; clips: { externalId: string; provider: string }[] | null; credits: { role: string; name: string; characterName: string | null }[] | null }; offers: Offer[] | null };

function bestOffer(offers: Offer[] | null) { return [...(offers ?? [])].filter((offer) => offer.standardWebURL && offer.package).sort((a, b) => (OFFER_PRIORITY.indexOf(a.monetizationType) + 1 || 99) - (OFFER_PRIORITY.indexOf(b.monetizationType) + 1 || 99))[0] ?? null; }

export function mapJustWatchNode(node: Node) {
  const c = node.content;
  const posterUrl = c.posterUrl ? `https://images.justwatch.com${c.posterUrl.replace("{profile}", "s718").replace("{format}", "jpg")}` : null;
  const offer = bestOffer(node.offers);
  const platform = offer ? PLATFORM_BY_NAME[offer.package!.technicalName] ?? "other" : null;
  return { id: node.id, title: c.title, contentType: node.objectType === "SHOW" ? "tv_show" : "movie", year: c.originalReleaseYear, releaseDate: c.originalReleaseDate ?? (c.originalReleaseYear ? `${c.originalReleaseYear}-01-01` : null), runtime: c.runtime || null, rating: VALID_RATINGS.has(c.ageCertification ?? "") ? c.ageCertification : null, synopsis: c.shortDescription ?? null, genre: c.genres?.map((genre) => GENRE_NAMES[genre.shortName] ?? genre.shortName).join(", ") ?? "", posterUrl, trailerUrl: c.clips?.find((clip) => clip.provider === "YOUTUBE" && clip.externalId) ? `https://www.youtube.com/embed/${c.clips.find((clip) => clip.provider === "YOUTUBE" && clip.externalId)!.externalId}` : null, castMembers: c.credits?.filter((credit) => credit.role === "ACTOR" || credit.role === "DIRECTOR").map((credit) => ({ role: credit.role === "DIRECTOR" ? "director" as const : "actor" as const, name: credit.name, characterName: credit.characterName || null })) ?? null, streamingPlatform: platform, otherPlatform: platform === "other" ? offer?.package?.clearName ?? null : null, streamingUrl: offer?.standardWebURL ?? null };
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const query = new URL(request.url).searchParams.get("q")?.trim();
  if (!query) return Response.json({ success: false, error: 'Search query "q" is required' }, { status: 400 });
  try {
    const response = await fetch(JUSTWATCH_GRAPHQL_URL, { method: "POST", signal: AbortSignal.timeout(GRAPHQL_TIMEOUT_MS), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: SEARCH_QUERY, variables: { country: "NG", language: "en", first: 30, filter: { searchQuery: query, objectTypes: ["MOVIE", "SHOW"] } } }) });
    if (!response.ok) throw new Error(`JustWatch responded with ${response.status}`);
    const result = await response.json() as { errors?: { message?: string }[]; data?: { popularTitles?: { edges?: { node: Node }[] } } };
    if (result.errors?.length) throw new Error(result.errors[0].message || "JustWatch query failed");
    return Response.json({ success: true, data: (result.data?.popularTitles?.edges ?? []).map((edge) => mapJustWatchNode(edge.node)) });
  } catch (error) {
    console.error("Error searching JustWatch:", error);
    return Response.json({ success: false, error: "Something went wrong. Please try again." }, { status: 502 });
  }
}

export async function action({ context, request }: Route.ActionArgs) {
  const services = context.get(appServicesContext);
  const authorization = await requireAdmin(services, request);
  if (authorization instanceof Response) return authorization;
  const body = await request.json() as { url?: unknown; catalog?: unknown };
  if (typeof body.url !== "string") return Response.json({ success: false, error: "An image URL is required" }, { status: 400 });
  if (typeof body.catalog !== "string" || !body.catalog.trim()) return Response.json({ success: false, error: "A catalog title is required" }, { status: 400 });
  try {
    const image = await fetchJustWatchImage(body.url);
    const { objectKey, publicId, version } = catalogPosterIdentity(body.catalog, image.extension);
    const digest = await crypto.subtle.digest("SHA-256", image.bytes.buffer as ArrayBuffer);
    const checksum = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    await services.objects.put(objectKey, image.bytes, { contentType: image.mimeType, contentLength: image.bytes.byteLength, cacheControl: "public, max-age=31536000, immutable" });
    const media = await services.db.media.create({ objectKey, publicId, version, mimeType: image.mimeType, byteSize: image.bytes.byteLength, checksum });
    return Response.json({ success: true, data: { id: media.id, objectKey, url: `/media/${objectKey}` } }, { status: 201 });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Image import failed" }, { status: 400 });
  }
}
