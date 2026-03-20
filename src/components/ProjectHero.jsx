import { useState, useEffect } from 'react'
import { Z } from '../layers'

/**
 * Satellite aerial background.
 * Priority: stored satellite_image_url (instant, no external call)
 *         → ESRI dynamic tile (only if no stored image)
 * Image is preloaded with JS to detect failures before setting CSS.
 */
function buildEsriUrl(lat, lng, width = 1920, height = 1080) {
  const latF = parseFloat(lat)
  const lngF = parseFloat(lng)
  const dLng = 0.004
  const dLat = dLng * (height / width) * 1.2
  const bbox = [lngF - dLng, latF - dLat, lngF + dLng, latF + dLat].join(',')
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${width},${height}&imageSR=4326&format=jpg&f=image`
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(url)
    img.onerror = reject
    img.src = url
  })
}

export default function ProjectHero({ project }) {
  const [resolvedUrl, setResolvedUrl] = useState(null)

  useEffect(() => {
    if (!project) { setResolvedUrl(null); return }

    let cancelled = false
    const storedUrl = project.satellite_image_url || null
    const hasCoords = project.latitude && project.longitude
    const esriUrl = hasCoords ? buildEsriUrl(project.latitude, project.longitude) : null

    async function resolve() {
      // 1. Try stored image first (fast, no external API call)
      if (storedUrl) {
        try {
          const url = await preloadImage(storedUrl)
          if (!cancelled) setResolvedUrl(url)
          return
        } catch { /* stored image failed, try ESRI */ }
      }

      // 2. Fall back to ESRI dynamic tile
      if (esriUrl) {
        try {
          const url = await preloadImage(esriUrl)
          if (!cancelled) setResolvedUrl(url)
          return
        } catch { /* ESRI also failed */ }
      }

      if (!cancelled) setResolvedUrl(null)
    }

    resolve()
    return () => { cancelled = true }
  }, [project?.id, project?.satellite_image_url, project?.latitude, project?.longitude])

  if (!resolvedUrl) return null

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: Z.SATELLITE, overflow: 'hidden' }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${resolvedUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'kenburns 40s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.10)' }}
        />
      </div>

      <style>{`
        @keyframes kenburns {
          0% { transform: scale(1.0) translate(0%, 0%); }
          50% { transform: scale(1.12) translate(-1.5%, -1%); }
          100% { transform: scale(1.06) translate(1%, -1.5%); }
        }
      `}</style>
    </>
  )
}
