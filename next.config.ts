import type { NextConfig } from "next";

/**
 * Las imágenes (logos de evento y fotos de botella) viven en Supabase Storage,
 * en el mismo host del proyecto. Se deriva de la env para no repetir el ref.
 */
const hostSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: hostSupabase
      ? [{ protocol: "https", hostname: hostSupabase, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
