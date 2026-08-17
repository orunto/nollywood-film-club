import type { Route } from "./+types/user-dashboard";
import { Link, useLoaderData } from "react-router";
import { appServicesContext } from "../context";

export async function loader({ context, request }: Route.LoaderArgs) {
  const services = context.get(appServicesContext);
  const session = await services.auth.getSession(request);
  if (!session) return Response.redirect(new URL("/auth?returnTo=/user-dashboard", request.url));
  return { session, ratings: await services.db.publicReads.getRatingsByUser(session.userId, { limit: 100 }) };
}

export default function UserDashboardRoute() {
  const { session, ratings } = useLoaderData<typeof loader>();
  const counts = { liked: ratings.filter((rating) => rating.rating === 10).length, okay: ratings.filter((rating) => rating.rating === 5).length, disliked: ratings.filter((rating) => rating.rating === 0).length };
  return <main className="min-h-screen bg-white px-6 py-10 text-black lg:px-12"><div className="mx-auto max-w-5xl"><header className="border-b border-black/10 pb-8"><p className="text-xs uppercase tracking-[0.24em] text-black/50">Member area</p><h1 className="mt-2 text-4xl font-semibold">{session.name}</h1><p className="mt-2 text-sm text-black/60">{session.email}</p><div className="mt-6 flex flex-wrap gap-8 text-sm"><span><strong className="text-2xl">{ratings.length}</strong> reviews</span><span><strong className="text-2xl">{counts.liked}</strong> liked</span><span><strong className="text-2xl">{counts.okay}</strong> okay</span><span><strong className="text-2xl">{counts.disliked}</strong> disliked</span></div></header><section className="py-8"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-semibold">Your reviews</h2><p className="mt-1 text-sm text-black/60">Manage ratings from the film detail pages.</p></div><Link className="border border-black px-4 py-2 text-sm" to="/movies-and-tv">Browse films</Link></div>{ratings.length === 0 ? <p className="mt-8 border border-black/10 p-8 text-sm text-black/60">You have not rated anything yet.</p> : <div className="mt-6 grid gap-3 sm:grid-cols-2">{ratings.map((rating) => <article key={rating.id} className="border border-black/10 p-4"><div className="flex justify-between gap-4"><div><p className="font-medium">{rating.film?.title ?? "Unknown title"}</p><p className="mt-1 text-xs uppercase tracking-widest text-black/50">{rating.rating === 10 ? "Liked" : rating.rating === 5 ? "Okay" : "Didn't like it"}</p></div><Link className="text-xs underline" to={`/reviews/${rating.id}`}>View</Link></div>{rating.review && <p className="mt-3 line-clamp-3 text-sm text-black/70">{rating.review}</p>}</article>)}</div>}</section></div></main>;
}
