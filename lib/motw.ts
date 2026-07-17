import { db } from "@/db/client";
import { content } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";

// Any transaction handle from db.transaction(), so callers can demote inside
// the same transaction as the write that promotes.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// content.is_movie_of_the_week is a singleton — promoting one film demotes every
// other. Three routes can promote (the star toggle's PATCH, and the content
// form's POST/PUT), so they all funnel through here.
//
// Call this INSIDE the promoting write's transaction and BEFORE it: the partial
// unique index motw_singleton rejects any moment where two rows are true, so
// demote-then-promote is the only order that works. `exceptId` keeps the film
// being promoted untouched when it is already the current pick.
export async function demoteOtherMoviesOfTheWeek(tx: Tx, exceptId?: string) {
  await tx
    .update(content)
    .set({ isMovieOfTheWeek: false, updatedAt: new Date() })
    .where(
      exceptId
        ? and(eq(content.isMovieOfTheWeek, true), ne(content.id, exceptId))
        : eq(content.isMovieOfTheWeek, true),
    );
}
