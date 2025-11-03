export type Episode = {
  seasonNum: number;
  episodeNum: number;
  episodeTitle: string;
  scenes: Array<{
    sceneStart: string;
    sceneEnd: string;
    location: string;
    subLocation?: string;
    characters: Array<{ name: string }>;
  }>;
};

export type EpisodesRoot = { episodes: Episode[] };

export async function loadEpisodes(): Promise<EpisodesRoot> {
  const res = await fetch('/data/episodes.json');
  if (!res.ok) throw new Error('Failed to load episodes');
  return res.json();
}

export type CharacterEntry = {
  characterName: string;
  characterImageThumb?: string;
  characterImageFull?: string;
  actorName?: string;
  houseName?: string[] | string;
  actorLink?: string;
  characterLink?: string;
};

export async function loadCharacters(): Promise<{ characters: CharacterEntry[] }> {
  const res = await fetch('/data/characters.json');
  if (!res.ok) throw new Error('Failed to load characters');
  return res.json();
}
export async function loadLocationCoordinates(): Promise<Record<string, {lat: number; lng: number; match: string}>> {
  const res = await fetch('/data/location-mapping-with-coords.json');
  if (!res.ok) throw new Error('Failed to load location mapping');
  const data = await res.json();
  return data;
}
