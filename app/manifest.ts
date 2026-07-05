import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EventGarden',
    short_name: 'EventGarden',
    description: 'Spazi. Momenti. Memorie.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#191B1D',
    theme_color: '#191B1D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
  }
}
