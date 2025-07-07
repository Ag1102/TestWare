import type {NextConfig} from 'next';

// --- TEMPORARY DIAGNOSTIC ---
// This will help confirm if your .env file is being loaded.
// Check your terminal when you run `npm run dev`.
console.log("\n--- Checking .env variables in next.config.ts ---");
console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Loaded" : "MISSING!");
console.log("--------------------------------------------------\n");

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
