import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { type LegalSection } from "@/components/custom/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy | Nollywood Film Club",
  description:
    "How Nollywood Film Club collects, uses, shares, and protects account, community, contact, and analytics data.",
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who is responsible for your data",
    content: (
      <p>
        Nollywood Film Club operates this Service and is responsible for the personal data described in this policy. Privacy questions and rights requests can be submitted through our <Link href="/contact">contact form</Link>.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    title: "Information we collect",
    content: (
      <>
        <p>We collect information in the following categories:</p>
        <ul>
          <li><strong>Account information:</strong> email address, display name, username, profile image, account identifier, sign-in provider, and account metadata.</li>
          <li><strong>Community activity:</strong> ratings, reviews, comments, edits, reports, moderation status, and the dates associated with that activity.</li>
          <li><strong>Messages to us:</strong> contact category, message, optional reply email, and account identifier when you are signed in.</li>
          <li><strong>Usage and technical information:</strong> page visits, referring information, device or browser information, approximate location derived from network data, and similar diagnostic events collected through hosting and analytics tools.</li>
        </ul>
        <p>
          When you sign in with Google or X, the provider and our authentication processor send us the account details you authorise. Password credentials are handled by Hexclave; Nollywood Film Club does not directly store your password in its application database.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-data",
    title: "How we use information",
    content: (
      <ul>
        <li>create and secure accounts, authenticate members, and maintain profiles;</li>
        <li>publish ratings, calculate community scores, and support reviews and discussion;</li>
        <li>detect abuse, investigate reports, enforce house rules, and protect the Service;</li>
        <li>answer contact messages and provide support;</li>
        <li>understand site usage, diagnose failures, and improve features; and</li>
        <li>meet legal obligations and establish or defend legal claims.</li>
      </ul>
    ),
  },
  {
    id: "legal-bases",
    title: "Why we may process it",
    content: (
      <>
        <p>
          Under the Nigeria Data Protection Act 2023, our legal bases depend on the activity. We process account and participation data to provide the Service you request; moderation, security, analytics, and improvement data for our legitimate interests in operating a safe and useful community; contact details with your consent or to answer your request; and information where necessary to comply with law.
        </p>
        <p>
          Where processing relies on consent, you may withdraw that consent. Withdrawal does not affect processing that was lawful before it was withdrawn.
        </p>
      </>
    ),
  },
  {
    id: "public-information",
    title: "What other people can see",
    content: (
      <>
        <p>
          The club is built around public conversation. Your username, display name, profile image, ratings, reviews, comments, edit status, and activity dates may be visible to anyone and may appear on public member profiles, title pages, review feeds, and scoreboards.
        </p>
        <p>
          Your email address, private reports, and contact messages are not intended to be public. Avoid including personal or confidential information in a review, comment, username, or other public field.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "When information is shared",
    content: (
      <>
        <p>We use service providers that process data on our behalf:</p>
        <ul>
          <li><strong>Hexclave</strong> for accounts, authentication, and session management;</li>
          <li><strong>Neon</strong> for managed database hosting;</li>
          <li><strong>Vercel</strong> for application hosting and site analytics; and</li>
          <li><strong>Cloudinary</strong> for image storage and delivery.</li>
        </ul>
        <p>
          Google or X also processes information when you choose its sign-in service. We may disclose information when required by law, to protect people or the Service, in connection with an organisational transfer, or with your direction. We do not sell personal data or use it for targeted advertising.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and analytics",
    content: (
      <p>
        The Service uses cookies or similar browser storage where necessary to keep you signed in, protect sessions, and remember essential state. Vercel Analytics helps us understand aggregate site use and performance. Your browser can restrict cookies, but blocking essential storage may prevent account features from working.
      </p>
    ),
  },
  {
    id: "retention-and-transfers",
    title: "Retention and international transfers",
    content: (
      <>
        <p>
          We keep account information while your account is active and retain community contributions while they remain part of the public discussion. If you delete your account, contributions that need to remain for discussion continuity will be disconnected from your account and public profile identifiers unless we have a legal or security reason to retain that connection. Contact messages, reports, and moderation records are kept for as long as reasonably needed to respond, protect the community, resolve disputes, and meet legal obligations. Backups and security records may remain for a limited period after deletion.
        </p>
        <p>
          Our providers may process information outside Nigeria. Where required, we use provider commitments and other lawful safeguards intended to protect data transferred internationally.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect information",
    content: (
      <p>
        We use reasonable technical and organisational safeguards, including managed authentication, access controls, secure connections, role-limited administration, and moderation controls. No internet service is completely secure, so we cannot guarantee that loss, misuse, or unauthorised access will never occur. Contact us promptly if you believe your account or information has been compromised.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your privacy rights",
    content: (
      <>
        <p>
          Subject to applicable law, you may ask to access, correct, erase, restrict, or receive a copy of your personal data; object to certain processing; or withdraw consent. You may also complain to the Nigeria Data Protection Commission.
        </p>
        <p>
          Use the <Link href="/contact">contact form</Link> to make a request or ask for account deletion. Choose &quot;Something else&quot; and provide your account email or username, a reply email, and enough detail for us to understand the request. We may need to verify your identity before acting. Some information may be retained where the law permits or requires it.
        </p>
      </>
    ),
  },
  {
    id: "children-and-changes",
    title: "Children and policy changes",
    content: (
      <>
        <p>
          The Service is not directed to children who cannot lawfully consent to the processing of their data. If you believe a child has provided personal information without the consent required by law, contact us so we can investigate and take appropriate action.
        </p>
        <p>
          We may update this policy when the Service or legal requirements change. The revised version will be posted here with a new effective date. For material changes, we will provide additional notice where reasonably possible or legally required.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="What the club knows about you, why we need it, and the choices you have. No mystery subplot."
      summary={[
        "Account details keep you signed in; your ratings and conversation make the club work.",
        "Profiles and contributions are public. Emails, reports, and contact messages are not.",
        "We use service providers to run the site, but do not sell your personal data.",
      ]}
      sections={sections}
    />
  );
}
