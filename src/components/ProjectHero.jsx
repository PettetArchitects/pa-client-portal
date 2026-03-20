import { Z } from '../layers'

/**
 * Subtle dark tint background layer.
 */
export default function ProjectHero({ project }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: Z.SATELLITE,
        backgroundColor: 'rgba(0, 0, 0, 0.06)',
      }}
    />
  )
}
