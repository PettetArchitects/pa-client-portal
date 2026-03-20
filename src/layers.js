/**
 * Z-index layering system for PA Client Portal.
 * Single source of truth — import these instead of hardcoding z-index values.
 *
 * Layer stack (bottom → top):
 *   SATELLITE   (0)   — background aerial imagery
 *   CHROME      (10)  — header, sidebar, main content panels
 *   ATTRIBUTION (11)  — Esri satellite attribution text
 *   OVERLAY     (100) — dropdown backdrops, modal scrims
 *   DROPDOWN    (110) — dropdown menus, popovers
 *   MODAL       (200) — modal dialogs
 *   TOAST       (300) — toast notifications
 */

export const Z = {
  SATELLITE:   0,
  CHROME:      10,
  ATTRIBUTION: 11,
  OVERLAY:     100,
  DROPDOWN:    110,
  MODAL:       200,
  TOAST:       300,
}
