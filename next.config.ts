import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile leaflet for Next.js bundling
  transpilePackages: ["leaflet", "react-leaflet", "react-leaflet-cluster"],

  // Security & PWA-friendly headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Cache OSM tile images via CDN
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // Allow external images (OSM, nominatim etc.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "tile.openstreetmap.org" },
    ],
  },
};

export default nextConfig;
