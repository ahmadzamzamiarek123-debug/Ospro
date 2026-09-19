/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/scanner',
        destination: '/presensi/scanner',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
