import { Z } from '../layers'

/**
 * Satellite aerial background with dark overlay.
 */
export default function ProjectHero({ project }) {
  const satelliteUrl = project?.satellite_image_url

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
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
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
