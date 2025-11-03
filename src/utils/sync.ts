export const makeTimeKey = (season: number, episode: number) =>
  `got-current-time-s${season}e${episode}`;

export const makeMetaKey = (season: number, episode: number) =>
  `got-meta-s${season}e${episode}`; // optional (play/pause, lastUpdated)
