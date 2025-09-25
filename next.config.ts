import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude Supabase functions from Next.js build
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    
    // Ignore Supabase functions directory
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/supabase/functions/**', '**/node_modules/**']
    };
    
    return config;
  },
  
  // Exclude TypeScript checking for Supabase functions
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Exclude Supabase functions from compilation
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
};

export default nextConfig;
