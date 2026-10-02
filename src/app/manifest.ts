import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'NIVO', short_name: 'NIVO', description: 'Ruang untuk langkah kecil, sesuai ritmemu.',
    lang: 'id', start_url: '/home', scope: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#075553',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
