import type { Route } from "./+types/api.contact";
import { appServicesContext } from "../context";
import {
  CONTACT_CATEGORIES,
  MAX_CONTACT_LENGTH,
  type ContactCategory,
} from "../../lib/contact";

const CATEGORIES = CONTACT_CATEGORIES.map((c) => c.value) as readonly string[];

// Deliberately loose: this only decides whether we bother storing a reply-to,
// and a rejected address is more annoying than an undeliverable one.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Bug reports and suggestions from the Contact page.
// Body: { category, message, email?, website? }
//
// No auth: a report that reads "I can't sign in" has to be able to reach us.
// When there IS a session we attach the user id, so admins can follow up.
export async function action({ request, context }: Route.ActionArgs) {
  const services = context.get(appServicesContext);

  try {
    const body = await request.json();
    const { category, message, email, website } = body as {
      category?: unknown;
      message?: unknown;
      email?: unknown;
      website?: unknown;
    };

    // Honeypot. Real people never see this field, so anything in it is a bot —
    // answer 200 so the bot has nothing to tune against, and store nothing.
    if (typeof website === "string" && website.trim()) {
      return Response.json({ success: true, message: "Thanks. We will take a look." });
    }

    if (typeof category !== "string" || !CATEGORIES.includes(category)) {
      return Response.json({
        success: false,
        error: "Pick what this is about",
      }, { status: 400 });
    }

    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    if (!trimmedMessage) {
      return Response.json({
        success: false,
        error: "Tell us something. Anything.",
      }, { status: 400 });
    }
    if (trimmedMessage.length > MAX_CONTACT_LENGTH) {
      return Response.json({
        success: false,
        error: `Keep it under ${MAX_CONTACT_LENGTH} characters`,
      }, { status: 400 });
    }

    const replyTo = typeof email === "string" ? email.trim() : "";
    if (replyTo && !looksLikeEmail(replyTo)) {
      return Response.json({
        success: false,
        error: "That email address does not look right",
      }, { status: 400 });
    }

    // Signed in is a bonus, not a requirement — never fail the submission over it
    let userId: string | null = null;
    try {
      const session = await services.auth.getSession(request);
      userId = session?.userId ?? null;
    } catch (error) {
      console.error("Could not resolve the sender of a contact message:", error);
    }

    await services.db.contacts.create({
      category: category as ContactCategory,
      message: trimmedMessage,
      email: replyTo || null,
      userId,
    });

    return Response.json({
      success: true,
      message: "Sent. Somebody will read it, which is more than most forms can promise.",
    });
  } catch (error) {
    console.error("Error saving contact message:", error);
    return Response.json({
      success: false,
      error: "Something went wrong. Please try again.",
    }, { status: 500 });
  }
}