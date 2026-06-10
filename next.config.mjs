/** @type {import('next').NextConfig} */
const nextConfig = {
  // @reapp-sdk/core + @stellar/stellar-sdk are server-only (used in API routes).
  serverExternalPackages: ["@reapp-sdk/core", "@reapp-sdk/stellar", "@stellar/stellar-sdk"],
};

export default nextConfig;
