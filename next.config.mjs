/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/generate-pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"]
    }
  }
};

export default nextConfig;
