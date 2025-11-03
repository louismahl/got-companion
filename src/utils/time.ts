export function parseTimeToSeconds(t: string): number {
  // supporte "HH:MM:SS" ou "MM:SS"
  const parts = t.split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return Number(t) || 0; // fallback si déjà en secondes
}
