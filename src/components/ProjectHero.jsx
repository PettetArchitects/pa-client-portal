import { useState, useEffect } from 'react'
import { Z } from '../layers'

/**
 * Satellite aerial background.
 * Prefers dynamic ESRI World Imagery tile from lat/long (sharp, correct position).
 * Falls back to stored satellite_image_url if no coordinates or ESRI fails.
 * Uses Image() preload so we detect failures and can swap URLs.
 */
function buildSatelliteUrl(lat, lng, width = 1920, height = 1080) {
  const latF = parseFloat(lat)
  const lngF = parseFloat(lng)
  const dLng = 0.004
  const dLat = dLng * (height / width) * 1.2
  const bbox = [lngF - dLng, latF - dLat, lngF + dLng, latF + dLat].join(',')
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${width},${height}&imageSR=4326&format=jpg&f=image`
}

export default function ProjectHero({ project }) {
  const [resolvedUrl, setResolvedUrl] = useState(null)

  useEffect(() => {
    if (!project) { setResolvedUrl(null); return }

    const hasCoords = project.latitude && project.longitude
    const esriUrl = hasCoords ? buildSatelliteUrl(project.latitude, project.longitude) : null
    const fallbackUrl = project.satellite_image_url || null

    if (!esriUrl && !fallbackUrl) {
      setResolvedUrl(null)
      return
    }

    // Try ESRI first, fall back to stored URL
    if (esriUrl) {
      const img = new Image()
      img.onload = () => setResolvedUrl(esriUrl)
      img.onerror = () => {
        // ESRI failed — try fallback
        if (fallbackUrl) {
          const fb = new Image()
          fb.onload = () => setResolvedUrl(fallbackUrl)
          fb.onerror = () => setResolvedUrl(null)
          fb.src = fallbackUrl
        } else {
          setResolvedUrl(null)
        }
      }
      img.src = esriUrl
    } else if (fallbackUrl) {
      const img = new Image()
      img.onload = () => setResolvedUrl(fallbackUrl)
      img.onerror = () => setResolvedUrl(null)
      img.src = fallbackUrl
    }
  }, [project?.id, project?.latitude, project?.longitude, project?.satellite_image_url])

  if (!resolvedUrl) return null

  return (
    <>
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: Z.SATELLITE, overflow: 'hidden' }}
      >
        {/* Satellite image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${resolvedUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            animation: 'kenburns 40s ease-in-out infinite alternate',
          }}
        />
        {/* Dark overlay */}
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
