'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import MapView from '@/components/MapView';
import SceneInfo from '@/components/SceneInfo';
import {
  loadEpisodes,
  loadCharacters,
  loadLocationCoordinates,
  type Episode
} from '@/utils/data';
import { parseTimeToSeconds } from '@/utils/time';
import { makeTimeKey } from '@/utils/sync';

type Scene = Episode['scenes'][number];

export default function MapOnlyPage() {
  const router = useRouter();
  const { season, episode } = router.query as { season?: string; episode?: string };

  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [charactersIndex, setCharactersIndex] = useState<Map<string, any>>(new Map());
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number; match: string }>>({});
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Visibility toggles
  const [showPhotos, setShowPhotos] = useState(true);
  const [showSceneDetails, setShowSceneDetails] = useState(true);
  const [showMap, setShowMap] = useState(true);

  const s = useMemo(() => Number(season ?? 0), [season]);
  const e = useMemo(() => Number(episode ?? 0), [episode]);

  // Load data
  useEffect(() => {
    (async () => {
      const [{ episodes }, { characters }, coordsMap] = await Promise.all([
        loadEpisodes(),
        loadCharacters(),
        loadLocationCoordinates(), // loads your prebuilt /data/location-mapping-with-coords.json
      ]);

      const idx = new Map<string, any>();
      for (const ch of characters) idx.set(ch.characterName, ch);

      setCharactersIndex(idx);
      setEpisodes(episodes);
      setCoords(coordsMap);
    })().catch(console.error);
  }, []);

  const episodeData = useMemo(() => {
    if (!episodes || !s || !e) return null;
    return episodes.find(ep => ep.seasonNum === s && ep.episodeNum === e) ?? null;
  }, [episodes, s, e]);

  // Given a time, find the scene
  const updateSceneByTime = (t: number) => {
    if (!episodeData) return;
    const scene =
      episodeData.scenes.find(sc => {
        const start = parseTimeToSeconds(sc.sceneStart);
        const end = parseTimeToSeconds(sc.sceneEnd);
        return t >= start && t <= end;
      }) ?? null;
    setCurrentScene(scene);
  };

  // Listen to localStorage change events from the Player tab
  useEffect(() => {
    if (!s || !e) return;
    const timeKey = makeTimeKey(s, e);

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key !== timeKey) return;
      const t = parseFloat(ev.newValue || '0');
      if (!Number.isFinite(t)) return;
      setCurrentTime(t);
      updateSceneByTime(t);
    };

    window.addEventListener('storage', handleStorage);

    // Initialize once on mount with the last stored time (in case player already running)
    const tStr = localStorage.getItem(timeKey);
    if (tStr) {
      const t = parseFloat(tStr);
      if (Number.isFinite(t)) {
        setCurrentTime(t);
        updateSceneByTime(t);
      }
    }

    return () => window.removeEventListener('storage', handleStorage);
  }, [s, e, episodeData]);

  // Compute map center: prefer subLocation, fallback to location
  const center = useMemo<[number, number] | null>(() => {
    if (!currentScene) return null;
    const name = currentScene.subLocation || currentScene.location;
    if (!name) return null;
    const entry = coords[name];
    if (!entry) return null;
    return [entry.lat, entry.lng];
  }, [coords, currentScene]);

  return (
    <div style={{ padding: 16, color: '#ddd', background: '#000', minHeight: '100vh' }}>
      <h1 style={{ margin: '8px 0 12px' }}>
        Map & Scene — S{s}E{e}
      </h1>

      {/* ⚙️ Display settings */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          padding: 10,
          border: '1px solid #333',
          borderRadius: 8,
          background: '#111',
          color: '#ddd',
          fontSize: 13,
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showPhotos}
            onChange={() => setShowPhotos(!showPhotos)}
          />
          Show character photos
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showSceneDetails}
            onChange={() => setShowSceneDetails(!showSceneDetails)}
          />
          Show scene start / end / duration
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="checkbox"
            checked={showMap}
            onChange={() => setShowMap(!showMap)}
          />
          Show map
        </label>
      </div>

      {/* Current scene header */}
      <div
        style={{
          display: 'grid',
          gap: 8,
          padding: 12,
          border: '1px solid #222',
          borderRadius: 12,
          background: '#0b0b0b'
        }}
      >
        {showSceneDetails && (
          <div style={{ fontSize: 14, opacity: 0.75 }}>
            {currentScene
              ? `Scene ${currentScene.sceneStart} – ${currentScene.sceneEnd} • ${currentScene.location}${currentScene.subLocation ? ' / ' + currentScene.subLocation : ''}`
              : 'Waiting for player… open the Player tab and start playback.'}
          </div>
        )}

        {showPhotos && (
          <SceneInfo
            sceneLocation={currentScene?.location}
            characters={currentScene?.characters ?? []}
            charactersIndex={charactersIndex}
            showPhotos={true} // you can wire this to your checkboxes
          />
        )}
      </div>

      {/* Map */}
      {showMap && (
        <div style={{ marginTop: 12, border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
          <MapView center={center} label={currentScene?.subLocation || currentScene?.location || '—'} />
        </div>
      )}
    </div>
  );
}
