import MovieHero from './movie-hero';
import { Content } from "@/lib/server-queries";

interface MovieOfTheWeekProps {
    movie: Content | null;
    spaceUrl?: string | null;
    podcastLinks?: string[] | null;
}

export default function MovieOfTheWeek({ movie, spaceUrl, podcastLinks }: MovieOfTheWeekProps) {
    return <MovieHero movie={movie} title="Movie of the Week" showRating={true} spaceUrl={spaceUrl} podcastLinks={podcastLinks} />;
}
