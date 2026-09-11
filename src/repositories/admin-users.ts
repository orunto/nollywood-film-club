import { count, desc, eq } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "../db/schema";
import { userRatings, users } from "../db/schema";

type Database = BaseSQLiteDatabase<"async", unknown, typeof schema>;

export interface AdminUser {
  id: string;
  displayName: string;
  primaryEmail: string;
  profileImageUrl: string | null;
  signedUpAt: string;
  role: "admin" | "user";
  regular: boolean;
  reviewCount: number;
}

export type AdminRoleResult =
  | { status: "ok"; message: string }
  | { status: "missing" }
  | { status: "self-demotion" };

export class AdminUsersRepository {
  constructor(private readonly database: Database) {}

  async list(options: { limit?: number; offset?: number } = {}): Promise<AdminUser[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const rows = await this.database
      .select({ user: users, reviewCount: count(userRatings.id) })
      .from(users)
      .leftJoin(userRatings, eq(users.id, userRatings.userId))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map(({ user, reviewCount }) => ({
      id: user.id,
      displayName: user.name,
      primaryEmail: user.email,
      profileImageUrl: user.image,
      signedUpAt: user.createdAt.toISOString(),
      role: user.role === "admin" ? "admin" : "user",
      regular: user.regular,
      reviewCount: Number(reviewCount),
    }));
  }

  async setAdminRole(
    actorId: string,
    targetId: string,
    isAdmin: boolean,
  ): Promise<AdminRoleResult> {
    if (actorId === targetId && !isAdmin) return { status: "self-demotion" };
    const target = await this.find(targetId);
    if (!target) return { status: "missing" };

    await this.database
      .update(users)
      .set({ role: isAdmin ? "admin" : "user", updatedAt: new Date() })
      .where(eq(users.id, targetId));
    return {
      status: "ok",
      message: isAdmin ? "User promoted to admin" : "Admin access removed",
    };
  }

  async setRegular(targetId: string, regular: boolean): Promise<AdminRoleResult> {
    const target = await this.find(targetId);
    if (!target) return { status: "missing" };

    await this.database
      .update(users)
      .set({ regular, updatedAt: new Date() })
      .where(eq(users.id, targetId));
    return {
      status: "ok",
      message: regular ? "User marked as a regular" : "Regular status removed",
    };
  }

  async count(): Promise<number> {
    const [row] = await this.database.select({ total: count() }).from(users);
    return Number(row?.total ?? 0);
  }

  private async find(id: string) {
    const [user] = await this.database
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user ?? null;
  }
}
