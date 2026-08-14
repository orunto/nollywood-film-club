import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";
import { authenticateUser } from "@/lib/user-auth";
import { USERNAME_RE } from "@/lib/username";

export async function POST(request: NextRequest) {
  try {
    // Require a signed-in user. This endpoint enumerates the whole user list to
    // check name availability, so leaving it open invited anonymous scraping and
    // a cheap DoS. During onboarding the caller is already authenticated.
    const authResult = await authenticateUser();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // `usernames` (plural) checks a batch — onboarding offers several
    // suggestions at once, and one listUsers() scan can answer all of them.
    // `username` (singular) is the debounced single check the input makes.
    const { username, usernames } = await request.json();

    const batch: string[] | null = Array.isArray(usernames)
      ? usernames.filter((name): name is string => typeof name === "string")
      : null;

    if (!batch && (!username || typeof username !== "string")) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!batch && !USERNAME_RE.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens",
        },
        { status: 400 },
      );
    }

    let taken: Set<string>;
    try {
      const users = await stackServerApp.listUsers();
      taken = new Set(
        users
          .map((user) =>
            (user.clientMetadata as { username?: string } | null)?.username?.toLowerCase(),
          )
          .filter((name): name is string => Boolean(name)),
      );
    } catch (error) {
      // Hexclave unreachable. Say available rather than blocking onboarding —
      // create-username is the write path and gets the last word.
      console.error("Error listing users for a username check:", error);
      taken = new Set();
    }

    if (batch) {
      return NextResponse.json({
        results: batch.map((name) => ({
          username: name,
          available: USERNAME_RE.test(name) && !taken.has(name.toLowerCase()),
        })),
      });
    }

    const available = !taken.has(username.toLowerCase());
    return NextResponse.json({
      available,
      message: available ? "Username is available" : "Username is already taken",
    });
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
