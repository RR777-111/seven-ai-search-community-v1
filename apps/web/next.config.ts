import type { NextConfig } from 'next';

const apiBaseUrl = (process.env.API_BASE_URL || 'http://127.0.0.1:3001').replace(/\/+$/, '');
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: '/search', destination: `${apiBaseUrl}/search` }, { source: '/health', destination: `${apiBaseUrl}/health` }];
  },
};
export default nextConfig;
