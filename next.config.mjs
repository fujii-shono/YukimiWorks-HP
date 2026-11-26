/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/works/r18/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/circle/about', destination: '/circle', permanent: true },
      { source: '/circle/contact', destination: '/circle', permanent: true },
      { source: '/portfolio/:path*', destination: '/works', permanent: true },
      { source: '/diary/:path*', destination: '/news', permanent: true },
      { source: '/links', destination: '/circle', permanent: true },
      { source: '/bokin', destination: '/messages', permanent: false },
      { source: '/back-alley/portfolio/:id', destination: '/works/r18/:id', permanent: true },
      { source: '/back-alley/:path*', destination: '/works', permanent: true },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
};

export default nextConfig;
