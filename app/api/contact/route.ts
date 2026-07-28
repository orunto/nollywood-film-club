import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { contactMessages } from '@/db/schema';
import { stackServerApp } from '@/stack';
import {
  CONTACT_CATEGORIES,
  MAX_CONTACT_LENGTH,
  type ContactCategory,
} from '@/lib/contact';

const CATEGORIES = CONTACT_CATEGORIES.map((c) => c.value) as readonly string[];

// Deliberately loose: this only decides whether we bother storing a reply-to,
// and a rejected address is more annoying than an undeliverable one.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Bug reports and suggestions from the Contact page.
// Body: { category, message, email?, website? }
//
// No auth: a report that reads "I can't sign in" has to be able to reach us.
// When there IS a session we attach the user id, so admins can follow up.
export async function POST(request: NextRequest) {
  try {
    const { category, message, email, website } = await request.json();

    // Honeypot. Real people never see this field, so anything in it is a bot —
    // answer 200 so the bot has nothing to tune against, and store nothing.
    if (typeof website === 'string' && website.trim()) {
      return NextResponse.json({ success: true, message: 'Thanks. We will take a look.' });
    }

    if (!CATEGORIES.includes(category)) {
      return NextResponse.json({
        success: false,
        error: 'Pick what this is about',
      }, { status: 400 });
    }

    const body = typeof message === 'string' ? message.trim() : '';
    if (!body) {
      return NextResponse.json({
        success: false,
        error: 'Tell us something. Anything.',
      }, { status: 400 });
    }
    if (body.length > MAX_CONTACT_LENGTH) {
      return NextResponse.json({
        success: false,
        error: `Keep it under ${MAX_CONTACT_LENGTH} characters`,
      }, { status: 400 });
    }

    const replyTo = typeof email === 'string' ? email.trim() : '';
    if (replyTo && !looksLikeEmail(replyTo)) {
      return NextResponse.json({
        success: false,
        error: 'That email address does not look right',
      }, { status: 400 });
    }

    // Signed in is a bonus, not a requirement — never fail the submission over it
    let userId: string | null = null;
    try {
      const user = await stackServerApp.getUser();
      userId = user?.id ?? null;
    } catch (error) {
      console.error('Could not resolve the sender of a contact message:', error);
    }

    await db.insert(contactMessages).values({
      category: category as ContactCategory,
      message: body,
      email: replyTo || null,
      userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Sent. Somebody will read it, which is more than most forms can promise.',
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json({
      success: false,
      error: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}
