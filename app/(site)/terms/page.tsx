import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument, { type LegalSection } from "@/components/custom/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service | Nollywood Film Club",
  description:
    "The rules for using Nollywood Film Club, creating an account, and taking part in community ratings and discussions.",
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to these terms",
    content: (
      <>
        <p>
          These Terms of Service govern your access to and use of the Nollywood Film Club website and its community features (the <strong>Service</strong>). By using the Service, you agree to these terms. If you do not agree, do not use the Service.
        </p>
        <p>
          You must be legally capable of agreeing to these terms. If local law requires a parent or guardian to consent to your use of an online service, you may use the Service only with that consent.
        </p>
      </>
    ),
  },
  {
    id: "the-club",
    title: "What the club provides",
    content: (
      <>
        <p>
          Nollywood Film Club is a community for discovering, watching, rating, and discussing Nollywood films and television. The Service may include a featured title, catalog information, community scores, member reviews, comments, discussion and podcast links, external reviews, and club-authored material.
        </p>
        <p>
          Catalog details, availability, release information, scores, and external links may change or contain errors. They are provided for discovery and discussion, not as professional advice or a guarantee that a title is available in your location.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and profiles",
    content: (
      <>
        <p>
          Some features require an account. You agree to provide accurate information, keep your sign-in method secure, and tell us through the <Link href="/contact">contact form</Link> if you believe your account has been compromised.
        </p>
        <p>
          Usernames must not impersonate another person, mislead the community, infringe rights, or contain abusive or unlawful material. Your username, display name, profile image, ratings, reviews, and comments may appear publicly with your activity.
        </p>
      </>
    ),
  },
  {
    id: "contributions",
    title: "Your ratings and contributions",
    content: (
      <>
        <p>
          You keep ownership of original reviews, comments, reports, and other material you submit. You give Nollywood Film Club a non-exclusive, worldwide, royalty-free licence to host, store, reproduce, display, and moderate that material as needed to operate and improve the Service. This licence ends when the material is deleted, except for copies reasonably retained for legal, security, backup, or moderation purposes.
        </p>
        <p>
          You are responsible for what you submit and must have the rights needed to submit it. Community scores reflect member opinions. We do not endorse or independently verify every contribution.
        </p>
      </>
    ),
  },
  {
    id: "house-rules",
    title: "House rules",
    content: (
      <>
        <p>Every opinion about a film is welcome. Personal attacks are not. You must not use the Service to:</p>
        <ul>
          <li>harass, threaten, abuse, or target another person;</li>
          <li>post spam, deceptive material, malicious code, or unauthorised advertising;</li>
          <li>break the law, infringe intellectual property or privacy rights, or encourage harmful conduct;</li>
          <li>impersonate someone, manipulate ratings, evade restrictions, or interfere with the Service; or</li>
          <li>collect information about other members without permission.</li>
        </ul>
        <p>
          Criticise the work as strongly as you like. Keep unrelated insults and abuse away from the people discussing it.
        </p>
      </>
    ),
  },
  {
    id: "moderation",
    title: "Moderation and enforcement",
    content: (
      <>
        <p>
          Members can report reviews and comments for issues such as harassment, spam, spoilers, or off-topic content. We may review, flag, restrict, or remove contributions and may limit or suspend accounts when reasonably necessary to protect the community, comply with law, or enforce these terms.
        </p>
        <p>
          Moderation decisions involve judgement. We do not promise to review every contribution before it appears or to act on every report. If you think we made a mistake, contact us with the relevant details.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <p>
        The Service links to platforms operated by others, including streaming services, X, podcast services, YouTube, publications, and authentication providers. Their content, availability, security, and terms are outside our control. Following a link or using a third-party sign-in option creates a separate relationship between you and that provider.
      </p>
    ),
  },
  {
    id: "intellectual-property",
    title: "Our content and intellectual property",
    content: (
      <p>
        The Service&apos;s design, branding, software, original editorial material, and compilation of content belong to Nollywood Film Club or its licensors and are protected by applicable law. You may use the Service for personal, non-commercial participation. You may not copy, sell, scrape, republish, or exploit substantial parts of it without permission, except where applicable law expressly allows it. Film artwork, trailers, names, and linked material may belong to their respective owners.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and responsibility",
    content: (
      <>
        <p>
          We work to keep the Service useful and available, but it is provided on an <strong>as available</strong> basis. We do not guarantee uninterrupted access, error-free information, preserved contributions, or compatibility with every device.
        </p>
        <p>
          To the extent permitted by law, Nollywood Film Club is not responsible for indirect or consequential losses arising from use of the Service or third-party services. Nothing in these terms excludes liability or consumer rights that cannot lawfully be excluded under Nigerian law.
        </p>
      </>
    ),
  },
  {
    id: "ending-use",
    title: "Ending use and account deletion",
    content: (
      <>
        <p>
          You may stop using the Service at any time. To request deletion of your account and associated personal data, use the <Link href="/contact">contact form</Link>, choose &quot;Something else,&quot; and include your account email or username and a reply email. If a contribution needs to remain for the continuity of a public discussion, we will remove its link to your account and public profile identifiers unless we have a legal or security reason not to. We may retain limited information where required for security, legal compliance, dispute resolution, or enforcement.
        </p>
        <p>
          We may suspend or end access when these terms are materially or repeatedly breached, when required by law, or when the Service is discontinued.
        </p>
      </>
    ),
  },
  {
    id: "changes-and-law",
    title: "Changes, governing law, and contact",
    content: (
      <>
        <p>
          We may update these terms as the Service changes. We will post the revised terms here and update the effective date. Material changes will apply prospectively, and continued use after they take effect means you accept them.
        </p>
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. Disputes that cannot be resolved informally will be subject to the jurisdiction of the courts of Nigeria, except where applicable law gives you another mandatory right.
        </p>
        <p>
          Questions about these terms can be sent through our <Link href="/contact">contact form</Link>.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      description="The house rules for using the site, joining the club, and adding your voice to the conversation."
      summary={[
        "Your opinions are yours. You give us permission to display and moderate what you post.",
        "Criticise films freely; do not harass people, spam the community, or manipulate ratings.",
        "External streaming, social, and podcast services operate under their own terms.",
      ]}
      sections={sections}
    />
  );
}
