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
