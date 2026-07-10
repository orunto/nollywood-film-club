import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin } from '@/lib/admin-auth';

// Unofficial JustWatch GraphQL API — no key required
const JUSTWATCH_GRAPHQL_URL = 'https://apis.justwatch.com/graphql';
const COUNTRY = 'NG';
const LANGUAGE = 'en';

const SEARCH_QUERY = `
query GetSearchTitles($country: Country!, $language: Language!, $first: Int!, $filter: TitleFilter) {
  popularTitles(country: $country, filter: $filter, first: $first) {
    edges {
      node {
        id
        objectType
        content(country: $country, language: $language) {
          title
          originalReleaseYear
          originalReleaseDate
          runtime
          shortDescription
          genres { shortName }
          posterUrl
          ageCertification
          clips { externalId provider }
        }
        offers(country: $country, platform: WEB) {
          monetizationType
          standardWebURL
          package { clearName technicalName }
        }
      }
    }
  }
}`;

const GENRE_NAMES: Record<string, string> = {
  act: 'Action',
  ani: 'Animation',
  cmy: 'Comedy',
  crm: 'Crime',
  doc: 'Documentary',
  drm: 'Drama',
  eur: 'European',
  fml: 'Family',
  fnt: 'Fantasy',
  hrr: 'Horror',
  hst: 'History',
  msc: 'Music',
  rly: 'Reality TV',
  rma: 'Romance',
  scf: 'Sci-Fi',
  spt: 'Sport',
  trl: 'Thriller',
  war: 'War',
  wsn: 'Western',
};

// content.rating enum values — only import certifications we can store
const VALID_RATINGS = new Set([
  'G', 'PG', 'PG-13', 'R', 'NC-17',
  'TV-Y', 'TV-Y7', 'TV-G', 'TV-PG', 'TV-14', 'TV-MA',
]);

// JustWatch package technicalName → content.streamingPlatform enum
const PLATFORM_BY_TECHNICAL_NAME: Record<string, string> = {
  netflix: 'netflix',
  amazonprime: 'prime_video',
  amazonprimevideo: 'prime_video',
  disneyplus: 'disney_plus',
  hulu: 'hulu',
  hbomax: 'hbo_max',
  max: 'hbo_max',
  appletvplus: 'apple_tv',
  appletv: 'apple_tv',
  itunes: 'apple_tv',
  paramountplus: 'paramount_plus',
  peacock: 'peacock',
  peacocktv: 'peacock',
};

const OFFER_PRIORITY = ['FLATRATE', 'FREE', 'ADS', 'RENT', 'BUY'];

interface JustWatchOffer {
  monetizationType: string;
  standardWebURL: string | null;
  package: { clearName: string; technicalName: string } | null;
}

interface JustWatchNode {
  id: string;
  objectType: string;
  content: {
    title: string;
    originalReleaseYear: number | null;
    originalReleaseDate: string | null;
    runtime: number | null;
    shortDescription: string | null;
    genres: { shortName: string }[] | null;
    posterUrl: string | null;
    ageCertification: string | null;
    clips: { externalId: string; provider: string }[] | null;
  };
  offers: JustWatchOffer[] | null;
}

function pickBestOffer(offers: JustWatchOffer[] | null): JustWatchOffer | null {
  if (!offers?.length) return null;
  const usable = offers.filter((o) => o.standardWebURL && o.package);
  usable.sort(
    (a, b) =>
      (OFFER_PRIORITY.indexOf(a.monetizationType) + 1 || OFFER_PRIORITY.length + 1) -
      (OFFER_PRIORITY.indexOf(b.monetizationType) + 1 || OFFER_PRIORITY.length + 1),
  );
  return usable[0] ?? null;
}

function mapNode(node: JustWatchNode) {
  const { content } = node;

  const posterUrl = content.posterUrl
    ? `https://images.justwatch.com${content.posterUrl
        .replace('{profile}', 's718')
        .replace('{format}', 'jpg')}`
    : null;

  const trailer = content.clips?.find((c) => c.provider === 'YOUTUBE' && c.externalId);
  const offer = pickBestOffer(node.offers);
  const technicalName = offer?.package?.technicalName ?? '';
  const platform = offer ? PLATFORM_BY_TECHNICAL_NAME[technicalName] ?? 'other' : null;

  return {
    id: node.id,
    title: content.title,
    contentType: node.objectType === 'SHOW' ? 'tv_show' : 'movie',
    year: content.originalReleaseYear,
    releaseDate:
      content.originalReleaseDate ??
      (content.originalReleaseYear ? `${content.originalReleaseYear}-01-01` : null),
    runtime: content.runtime || null,
    rating: VALID_RATINGS.has(content.ageCertification ?? '') ? content.ageCertification : null,
    synopsis: content.shortDescription ?? null,
    genre:
      content.genres
        ?.map((g) => GENRE_NAMES[g.shortName] ?? g.shortName)
        .join(', ') ?? '',
    posterUrl,
    trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.externalId}` : null,
    streamingPlatform: platform,
    otherPlatform: platform === 'other' ? offer?.package?.clearName ?? null : null,
    streamingUrl: offer?.standardWebURL ?? null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateAdmin();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const query = request.nextUrl.searchParams.get('q')?.trim();
    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Search query "q" is required'
      }, { status: 400 });
    }

    const response = await fetch(JUSTWATCH_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: {
          country: COUNTRY,
          language: LANGUAGE,
          first: 8,
          filter: { searchQuery: query, objectTypes: ['MOVIE', 'SHOW'] },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`JustWatch responded with ${response.status}`);
    }

    const result = await response.json();
    if (result.errors?.length) {
      throw new Error(result.errors[0].message || 'JustWatch query failed');
    }

    const edges: { node: JustWatchNode }[] = result.data?.popularTitles?.edges ?? [];

    return NextResponse.json({
      success: true,
      data: edges.map((edge) => mapNode(edge.node)),
    });
  } catch (error) {
    console.error('Error searching JustWatch:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
