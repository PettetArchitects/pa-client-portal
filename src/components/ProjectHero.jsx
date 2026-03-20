import { Z } from '../layers'

/**
 * Satellite aerial background.
 * Prefers dynamic ESRI World Imagery tile from lat/long (sharp, correct position).
 * Falls back to stored satellite_image_url if no coordinates.
 */
function buildSatelliteUrl(lat, lng, width = 1920, height = 1080) {
  // ESRI World Imagery — free, no API key, high resolution
  const latF = parseFloat(lat)
  const lngF = parseFloat(lng)
  // Span ~600m wide for residential sites
  const dLng = 0.004
  const dLat = dLng * (height / width) * 1.2
  const bbox = [lngF - dLng, latF - dLat, lngF + dLng, latF + dLat].join(',')
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bbox}&bboxSR=4326&size=${width},${height}&imageSR=4326&format=jpg&f=image`
}

export default function ProjectHero({ project }) {
  const hasCoords = project?.latitude && project?.longitude
  const satelliteUrl = hasCoords
    ? buildSatelliteUrl(project.latitude, project.longitude)
    : project?.satellite_image_url

  if (!satelliteUrl) return null

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
            backgroundImage: `url(${satelliteUrl})`,
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
