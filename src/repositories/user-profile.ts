import type { AtomicCommand, AtomicResult } from "../services/contracts";

export interface UserProfileAccess {
  publicReads: {
    getUsernameOwner(username: string): Promise<{ userId: string } | null>;
    userExists(userId: string): Promise<boolean>;
  };
  atomic(commands: AtomicCommand[]): Promise<AtomicResult[]>;
}

export type SetUsernameResult =
  | { status: "ok" }
  | { status: "taken" }
  | { status: "user-missing" };

export class UserProfileRepository {
  constructor(private readonly access: UserProfileAccess) {}

  // Usernames are unique case-insensitively (users_username_lower_unique), so
  // availability is a single indexed lookup. NULL usernames never collide.
  async isUsernameTaken(username: string): Promise<boolean> {
    return (await this.access.publicReads.getUsernameOwner(username)) !== null;
  }

  // Sets the caller's username (and optionally their display name) in one
  // statement. The username is stored lowercased so the unique index and every
  // comparison agree. Ownership is checked first for a clean conflict result,
  // and the unique index catches the lost-race case on the write itself.
  async setUsername(
    userId: string,
    username: string,
    displayName?: string | null,
  ): Promise<SetUsernameResult> {
    if (!(await this.access.publicReads.userExists(userId))) {
      return { status: "user-missing" };
    }

    const lowerUsername = username.toLowerCase();
    const owner = await this.access.publicReads.getUsernameOwner(lowerUsername);
    if (owner && owner.userId !== userId) {
      return { status: "taken" };
    }

    const normalizedDisplayName =
      displayName == null || displayName.trim() === "" ? null : displayName.trim();
    const now = Date.now();
    try {
      await this.access.atomic([
        {
          sql: `
            UPDATE users
            SET
              username = ?,
              name = CASE WHEN ? IS NOT NULL AND ? <> '' THEN ? ELSE name END,
              updated_at = ?
            WHERE id = ?
          `,
          params: [
            lowerUsername,
            normalizedDisplayName,
            normalizedDisplayName,
            normalizedDisplayName,
            now,
            userId,
          ],
        },
      ]);
      return { status: "ok" };
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { status: "taken" };
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    /UNIQUE constraint failed|unique constraint/i.test(error.message)
  );
}