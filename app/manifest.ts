import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Addio al Celibato Ale',
    short_name: 'Ibiza 2026',
    description: 'Protocollo Operativo Ibiza 2026',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#eab308',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}
