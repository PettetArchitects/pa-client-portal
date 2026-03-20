import { Z } from '../layers'

/**
 * Satellite aerial background — pre-stored in Supabase Storage.
 * Full-viewport bleed with Ken Burns pan + Esri attribution.
 */
export default function ProjectHero({ project }) {
  const satelliteUrl = project?.satellite_image_url

  if (!satelliteUrl) return null

  return (
    <>
      {/* Satellite background — image already preloaded during loading screen */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: Z.SATELLITE,
          overflow: 'hidden',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${satelliteUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.45,
            animation: 'kenburns 40s ease-in-out infinite alternate',
          }}
        />
        {/* No white overlay — matches PocketArchitect: raw 0.11 opacity */}
      </div>

      {/* Attribution — bottom right */}
      <div
        className="fixed bottom-3 right-3 pointer-events-none"
        style={{
          zIndex: Z.ATTRIBUTION,
          opacity: 0.4,
        }}
      >
        <p className="text-[9px] tracking-[0.5px] text-[var(--color-muted)] font-light">
          Imagery: Esri, Maxar, Earthstar Geographics
        </p>
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
