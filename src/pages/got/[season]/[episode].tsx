import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import MapView from '@/components/MapView';
import SceneInfo from '@/components/SceneInfo';
import { loadEpisodes, loadCharacters, loadLocationCoordinates, type Episode } from '@/utils/data';
import { parseTimeToSeconds } from '@/utils/time';

type Scene = Episode['scenes'][number];

export default function EpisodePage() {
  const router = useRouter();
  const { season, episode } = router.query as { season?: string; episode?: string };

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [charactersData, setCharactersData] = useState<Map<string, any>>(new Map());
  const [coords, setCoords] = useState<Record<string, [number, number]>>({});
  const [currentScene, setCurrentScene] = useState<Scene | null>(null);
  const [showOptions, setShowOptions] = useState({
    characters: true,
    photos: true,
    sceneInfo: true,
    map: true,
  });

  useEffect(() => {
    (async () => {
      const coords = await loadLocationCoordinates();
      console.log('Lieux détectés :', Object.keys(coords));
    })();
  }, []);

  // Charger données
  useEffect(() => {
    (async () => {
      const [{ episodes }, { characters }, coords] = await Promise.all([
        loadEpisodes(),
        loadCharacters(),
        loadLocationCoordinates(),
      ]);

      // index persos pour accès rapide
      const idx = new Map<string, any>();
      for (const ch of characters) idx.set(ch.characterName, ch);

      setCharactersData(idx);
      setEpisodes(episodes);
      setCoords(coords);
    })().catch(console.error);
  }, []);

  // Trouver l'episode demandé
  const episodeData = useMemo(() => {
    if (!episodes || !season || !episode) return null;
    const s = Number(season);
    const e = Number(episode);
    return episodes.find(ep => ep.seasonNum === s && ep.episodeNum === e) ?? null;
  }, [episodes, season, episode]);

  // Chercher scène courante selon currentTime
  const updateSceneByTime = (currentTimeSec: number) => {
    if (!episodeData) return;
    const scene = episodeData.scenes.find(sc => {
      const start = parseTimeToSeconds(sc.sceneStart);
      const end = parseTimeToSeconds(sc.sceneEnd);
      return currentTimeSec >= start && currentTimeSec <= end;
    }) ?? null;
    setCurrentScene(scene);
  };

  const onTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    updateSceneByTime(t);
  };

  // Au seek, on recalcule aussi
  const onSeeked = () => {
    const t = videoRef.current?.currentTime ?? 0;
    updateSceneByTime(t);
  };

  // Coords du lieu
  const center = useMemo<[number, number] | null>(() => {
    if (!currentScene) return null;

    // Prefer subLocation, fallback to location
    const name = currentScene.subLocation || currentScene.location;
    if (!name) return null;

    const entry = coords[name];
    if (!entry) return null;

    return [entry.lat, entry.lng];
  }, [coords, currentScene]);

  console.log('🎯 Current scene:', currentScene?.subLocation || currentScene?.location);
  console.log('🗺️ Center:', center);

  return (
    <div style={{display: 'grid', gap: 16, padding: 16, maxWidth: 1200, margin: '0 auto'}}>
      <h1 style={{marginBottom: 0}}>
        Game of Thrones — S{season}E{episode}{episodeData?.episodeTitle ? `: ${episodeData.episodeTitle}` : ''}
      </h1>

      {/* 1) Lecteur vidéo */}
      <video
        ref={videoRef}
        src={`/videos/s${season?.toString().padStart(2, '0')}e${episode?.toString().padStart(2, '0')}.mp4`}
        controls
        onTimeUpdate={onTimeUpdate}
        onSeeked={onSeeked}
        style={{width: '100%', borderRadius: 12, border: '1px solid #eee'}}
      />
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          padding: '8px 12px',
          border: '1px solid #eee',
          borderRadius: 8,
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={showOptions.characters}
            onChange={e => setShowOptions({...showOptions, characters: e.target.checked})}
          />
          Personnages
        </label>

        <label>
          <input
            type="checkbox"
            checked={showOptions.photos}
            onChange={e => setShowOptions({...showOptions, photos: e.target.checked})}
          />
          Photos des personnages
        </label>

        <label>
          <input
            type="checkbox"
            checked={showOptions.sceneInfo}
            onChange={e => setShowOptions({...showOptions, sceneInfo: e.target.checked})}
          />
          Infos de la scène
        </label>

        <label>
          <input
            type="checkbox"
            checked={showOptions.map}
            onChange={e => setShowOptions({...showOptions, map: e.target.checked})}
          />
          Carte
        </label>
      </div>

      {/* 2) Info scène */}
      <div style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
        {showOptions.sceneInfo && (
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            {currentScene
              ? `Scène : ${currentScene.sceneStart} – ${currentScene.sceneEnd} (${parseTimeToSeconds(currentScene.sceneEnd) - parseTimeToSeconds(currentScene.sceneStart)} s) • ${currentScene.location}${currentScene.subLocation ? ' / ' + currentScene.subLocation : ''}`
              : 'Lecture en attente… avance un peu pour détecter la 1ère scène.'}
          </div>
        )}

        {showOptions.characters && (
          <SceneInfo
            sceneLocation={currentScene?.location}
            characters={currentScene?.characters ?? []}
            charactersIndex={charactersData}
            showPhotos={showOptions.photos}
          />
        )}
      </div>


      {/* 3) Carte */}
      {showOptions.map && (
        <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
          <MapView center={center} label={currentScene?.subLocation || currentScene?.location || '—'} />
        </div>
      )}

    </div>
  );
}
