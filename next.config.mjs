/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: false,
  devIndicators: false,
  allowedDevOrigins: ['*.ngrok-free.dev'],
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'http://15.235.192.119:5003';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
