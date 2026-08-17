import MovieHero from './movie-hero';
import type { Content } from "../../repositories/public-read";

interface MovieOfTheWeekProps {
    movie: Content | null;
    spaceUrl?: string | null;
    podcastLinks?: string[] | null;
    discussionDate?: string | null;
}

export default function MovieOfTheWeek({ movie, spaceUrl, podcastLinks, discussionDate }: MovieOfTheWeekProps) {
    return <MovieHero movie={movie} title="Movie of the Week" showRating={true} spaceUrl={spaceUrl} podcastLinks={podcastLinks} discussionDate={discussionDate} />;
}