import { db } from '@/db/client'; // Your database client
import { content } from '../db/schema';

// Insert "Everybody Loves Jenifa" movie data
export async function insertMovieOfTheWeek() {
  try {
    const movieData = await db.insert(content).values({
      title: "Everybody Loves Jenifa",
      contentType: "movie",
      runtime: 135, // 2 hours 15 minutes = 135 minutes
      releaseDate: new Date("2000-01-01"), // Assuming 2000 release
      rating: "PG-13",
      synopsis: "Jenifa must navigate through jealousy and suspicion when her philanthropy position is threatened by her new neighbour in the estate. A trip to Ghana with friends turns dangerous when they are caught up in a drug scandal, forcing Jenifa to confront betrayal and danger, risking everything to protect her reputation and life.",
      genre: ["Comedy", "Drama"],
      posterImage: "nollywood-film-club/elj",
      trailerUrl: "https://www.youtube.com/embed/x4JIoP5FlhU?si=s-yYKArOOO6QD42e",
      streamingUrl: "https://www.primevideo.com/detail/Everybody-Loves-Jenifa/0G4DEZL3GDUGGLRPTKG19ZFEEE",
      streamingPlatform: "prime_video",
      spaceUrl: "https://x.com/i/spaces/1djGXWjZOORKZ",
      podcastLinks: [], // Empty array for now, can add podcast URLs later
      isMovieOfTheWeek: true,
    }).returning();

    console.log("Movie inserted successfully:", movieData);
    return movieData;
  } catch (error) {
    console.error("Error inserting movie:", error);
    throw error;
  }
}

// Alternative: Using raw SQL if you prefer
export const insertMovieSQL = `
INSERT INTO content (
  title,
  content_type,
  runtime,
  release_date,
  rating,
  synopsis,
  poster_image,
  trailer_url,
  streaming_url,
  streaming_platform,
  space_url,
  podcast_links,
  is_movie_of_the_week
) VALUES (
  'Everybody Loves Jenifa',
  'movie',
  135,
  '2000-01-01',
  'PG-13',
  'Jenifa must navigate through jealousy and suspicion when her philanthropy position is threatened by her new neighbour in the estate. A trip to Ghana with friends turns dangerous when they are caught up in a drug scandal, forcing Jenifa to confront betrayal and danger, risking everything to protect her reputation and life.',
  ARRAY['Comedy', 'Drama'],
  'nollywood-film-club/elj',
  'https://www.youtube.com/embed/x4JIoP5FlhU?si=s-yYKArOOO6QD42e',
  'https://www.primevideo.com/detail/Everybody-Loves-Jenifa/0G4DEZL3GDUGGLRPTKG19ZFEEE',
  'prime_video',
  'https://x.com/i/spaces/1djGXWjZOORKZ',
  '{}',
  true
);
`;

// Usage example:
// await insertMovieOfTheWeek();
