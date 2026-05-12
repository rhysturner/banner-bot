/**
 * Browser font loading with Google Fonts auto-fallback.
 *
 * Strategy: try to load family at document level. If the font is already
 * available (system or previously loaded), document.fonts.check returns true
 * and we no-op. Otherwise we inject a Google Fonts <link> for the family —
 * Google serves a 404 for non-existent families which simply leaves the
 * Fabric Textbox to fall back to its default UI font.
 *
 * User uploads (.ttf/.woff/.woff2) take priority — see addLocalFont.
 */

const loaded = new Set<string>();

export async function ensureFont(family: string, weight: number | string = 400): Promise<void> {
  const key = `${family}:${weight}`;
  if (loaded.has(key)) return;

  // already available?
  try {
    if (document.fonts.check(`16px "${family}"`)) { loaded.add(key); return; }
  } catch {/* old browsers */}

  // pull from Google
  const id = `gf-${family.replace(/\s+/g, '-')}-${weight}`;
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
    document.head.appendChild(link);
  }
  try { await document.fonts.load(`${weight} 16px "${family}"`); } catch {/* font 404 — Fabric falls back */}
  loaded.add(key);
}

/** Register a user-uploaded font file (woff/woff2/ttf/otf). */
export async function addLocalFont(family: string, file: File): Promise<void> {
  const buf = await file.arrayBuffer();
  const face = new FontFace(family, buf);
  await face.load();
  (document.fonts as any).add(face);
  loaded.add(`${family}:400`);
  loaded.add(`${family}:700`);
}
