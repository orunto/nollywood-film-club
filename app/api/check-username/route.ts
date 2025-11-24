import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

export async function POST(request: NextRequest) {
  try {
    const users = await stackServerApp.listUsers();
    const { username } = await request.json();

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 },
      );
    }

    // Check if username is valid (alphanumeric, underscores, hyphens, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-20 characters long and contain only letters, numbers, underscores, and hyphens",
        },
        { status: 400 },
      );
    }

    // Use Stack Auth admin to check if any user has this username in their metadata
    try {
      const existingUser = users.find(
        (user) =>
          user.clientMetadata?.username?.toLowerCase() ===
          username.toLowerCase(),
      );

      if (existingUser) {
        return NextResponse.json(
          { available: false, message: "Username is already taken" },
          { status: 200 },
        );
      }

      return NextResponse.json(
        { available: true, message: "Username is available" },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error checking username in Stack Auth:", error);
      return NextResponse.json(
        { available: true, message: "Username is available" },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error checking username:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
