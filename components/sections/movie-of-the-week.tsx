import MovieOfTheWeekClient from './movie-of-the-week-client';
import { Content } from "@/lib/server-queries";

interface MovieOfTheWeekProps {
    movie: Content | null;
}

export default function MovieOfTheWeek({ movie }: MovieOfTheWeekProps) {
    return <MovieOfTheWeekClient movie={movie} />;
}