/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'nrip.gov.in'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
    NEXT_PUBLIC_MAP_CENTER_LAT: '20.5937',
    NEXT_PUBLIC_MAP_CENTER_LNG: '78.9629',
    NEXT_PUBLIC_MAP_ZOOM: '5',
  },
}

module.exports = nextConfig
