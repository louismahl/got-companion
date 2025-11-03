'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { loadEpisodes, type Episode } from '@/utils/data';
import { parseTimeToSeconds } from '@/utils/time';
import { makeTimeKey, makeMetaKey } from '@/utils/sync';

export default function PlayerPage() {
  const router = useRouter();
  const { season, episode } = router.query as { season?: string; episode?: string };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [throttleGuard, setThrottleGuard] = useState(0); // ms timestamp to throttle writes

  // Load episodes once
  useEffect(() => {
    (async () => {
      const { episodes } = await loadEpisodes();
      setEpisodes(episodes);
    })().catch(console.error);
  }, []);

  const s = useMemo(() => Number(season ?? 0), [season]);
  const e = useMemo(() => Number(episode ?? 0), [episode]);

  const episodeData = useMemo(() => {
    if (!episodes || !s || !e) return null;
    return episodes.find(ep => ep.seasonNum === s && ep.episodeNum === e) ?? null;
  }, [episodes, s, e]);

  // Throttled writer to localStorage (≈4 updates/sec)
  const writeTime = (time: number) => {
    const now = performance.now();
    if (now - throttleGuard < 250) return; // throttle to 250ms
    setThrottleGuard(now);

    try {
      const timeKey = makeTimeKey(s, e);
      localStorage.setItem(timeKey, String(time));

      const metaKey = makeMetaKey(s, e);
      localStorage.setItem(
        metaKey,
        JSON.stringify({
          state: videoRef.current?.paused ? 'paused' : 'playing',
          lastUpdated: Date.now(),
        })
      );
    } catch (err) {
      // ignore quota errors
    }
  };

  const onTimeUpdate = () => {
    const t = videoRef.current?.currentTime ?? 0;
    writeTime(t);
  };

  const onSeeked = () => {
    const t = videoRef.current?.currentTime ?? 0;
    writeTime(t);
  };

  // OPTIONAL: read the last stored time on mount (if you reload the player tab)
  useEffect(() => {
    if (!s || !e || !videoRef.current) return;
    const tStr = localStorage.getItem(makeTimeKey(s, e));
    if (!tStr) return;
    const t = parseFloat(tStr);
    if (Number.isFinite(t)) {
      videoRef.current.currentTime = t;
    }
  }, [s, e]);

  if (!season || !episode) return <div style={{ padding: 20 }}>Loading…</div>;

  return (
    <div style={{ padding: 16, maxWidth: 1280, margin: '0 auto', color: '#ddd', background: '#000', minHeight: '100vh' }}>
      <h1 style={{ margin: '8px 0 16px' }}>
        Player — Game of Thrones S{s}E{e}{episodeData?.episodeTitle ? `: ${episodeData.episodeTitle}` : ''}
      </h1>

      <video
        ref={videoRef}
        src={`/videos/s${s.toString().padStart(2, '0')}e${e.toString().padStart(2, '0')}.mp4`}
        controls
        onTimeUpdate={onTimeUpdate}
        onSeeked={onSeeked}
        style={{ width: '100%', borderRadius: 12, border: '1px solid #222', background: '#000' }}
      />

      <p style={{ opacity: 0.6, marginTop: 12 }}>
        Tip: Open <code>/got/{s}/{e}/map</code> in another window and move it to your second screen.
      </p>
    </div>
  );
}
