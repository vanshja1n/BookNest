import { ALLOWED_IMAGE_DOMAINS, ALLOWED_IMAGE_WILDCARDS } from './src/lib/imageDomains.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      ...ALLOWED_IMAGE_DOMAINS.map(domain => ({
        protocol: 'https',
        hostname: domain,
        port: '',
        pathname: '/**',
      })),
      ...ALLOWED_IMAGE_WILDCARDS.map(wildcard => ({
        protocol: 'https',
        hostname: wildcard,
        port: '',
        pathname: '/**',
      })),
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
