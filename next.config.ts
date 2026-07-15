import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
         {
           protocol: 'https',
           hostname: 'lh3.googleusercontent.com',
           port: '',
           pathname: '/a/**',
         },
       ],
  },
  // Baseline hardening headers applied to every response. Kept conservative so
  // they don't fight the Stack Auth handler or the Cloudinary/Spotify embeds:
  // no blanket CSP here (a wrong CSP silently breaks third-party frames), just
  // the low-risk, high-value headers.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Stop MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent our pages (esp. the admin panel) being framed for clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Don't leak full URLs (which can carry ids/tokens) to other origins
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deny sensitive browser capabilities we never use
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Force HTTPS for two years (Cloudflare/host already serves TLS)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Details pages moved from /movies/<id> to /movie/<slug>; the [slug]
      // route then upgrades legacy UUIDs and stale slugs to the canonical URL
      {
        source: '/movies/:slug',
        destination: '/movie/:slug',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
