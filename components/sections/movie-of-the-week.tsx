import MovieHero from './movie-hero';
import { Content } from "@/lib/server-queries";

interface MovieOfTheWeekProps {
    movie: Content | null;
}

export default function MovieOfTheWeek({ movie }: MovieOfTheWeekProps) {
    return <MovieHero movie={movie} title="Movie of the Week" showRating={true} />;
}