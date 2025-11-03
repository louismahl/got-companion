'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useMemo } from 'react'
import { feature } from 'topojson-client'

// Dynamically import Leaflet to avoid SSR issues
const DynamicMap = dynamic(
  async () => {
    const L = await import('leaflet')
    const { MapContainer, GeoJSON, CircleMarker, Popup, useMap } = await import('react-leaflet')

    // Smooth camera movement on scene change
    function Recenter({ center }: { center: [number, number] }) {
      const map = useMap()
      useEffect(() => {
        if (center) map.flyTo(center, map.getZoom(), { duration: 1 })
      }, [center])
      return null
    }

    // The actual map component
    return function DarkTopoMap({
                                  data,
                                  places,
                                  center,
                                  label,
                                  landDarkness,
                                  waterDarkness
                                }: any) {
      const showMarker = !!center

      // derive colors based on sliders (0–1)
      const landBase = Math.floor(255 * landDarkness)
      const fillColor = `rgb(${landBase}, ${landBase}, ${landBase})`
      const borderColor = `rgb(${30 + landBase}, ${30 + landBase}, ${30 + landBase})`
      const waterBase = Math.floor(0 * waterDarkness)
      const waterBg = `rgb(${waterBase}, ${waterBase}, ${waterBase})`

      return (
        <div
          style={{
            background: waterBg,
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 0 25px rgba(255, 215, 0, 0.05)',
          }}
        >
          <MapContainer
            center={center ?? [35, 0]}
            zoom={3}
            minZoom={2}
            maxZoom={6}
            style={{
              height: '400px',
              width: '100%',
              backgroundColor: waterBg,
              filter: 'contrast(1.15)',
            }}
            zoomControl={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
          >
            {/* Land polygons */}
            <GeoJSON
              data={data}
              style={() => ({
                color: borderColor,
                weight: 0.5,
                fillColor,
                fillOpacity: 0.5
              })}
            />

            {/* Small red dots for places */}
            <GeoJSON
              data={places}
              pointToLayer={(_, latlng) =>
                L.circleMarker(latlng, {
                  radius: 2,
                  fillColor: '#c74b4b',
                  color: '#ff5050',
                  weight: 0.5,
                  opacity: 0.9,
                  fillOpacity: 0.8,
                })
              }
              onEachFeature={(f, layer) => {
                const name = f.properties?.name || 'Unknown'
                layer.bindPopup(
                  `<span style="color:#ffd700;font-weight:600">${name}</span>`,
                  { className: 'dark-map-popup' }
                )
              }}
            />

            {/* Current location marker */}
            {showMarker && (
              <>
                <CircleMarker
                  center={center}
                  radius={7}
                  color="#FFD700"
                  fillColor="#FFA500"
                  fillOpacity={1}
                  weight={2}
                >
                  <Popup>
                    <div
                      style={{
                        color: '#FFD700',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                      }}
                    >
                      {label ?? 'Current scene'}
                    </div>
                  </Popup>
                </CircleMarker>
                <Recenter center={center} />
              </>
            )}
          </MapContainer>
        </div>
      )
    }
  },
  { ssr: false }
)

type Props = {
  center?: [number, number] | null
  label?: string
}

export default function MapView({ center, label }: Props) {
  const [mapData, setMapData] = useState<any>(null)
  const [placesData, setPlacesData] = useState<any>(null)

  // new state for customization
  const [showLand, setShowLand] = useState(false)
  const [landDarkness, setLandDarkness] = useState(1)
  const [waterDarkness, setWaterDarkness] = useState(1)

  useEffect(() => {
    ;(async () => {
      const topo = await fetch('/data/lands-of-ice-and-fire.json').then(r => r.json())
      const land = feature(topo, topo.objects.land)
      const places = topo.objects.places ? feature(topo, topo.objects.places) : { features: [] }
      setMapData(land)
      setPlacesData(places)
    })()
  }, [])

  const safeCenter: [number, number] | null = useMemo(() => (center ? center : null), [center])

  if (!mapData)
    return <div className="h-[400px] w-full bg-black/90 rounded-md animate-pulse" />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* 🔧 Controls */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          background: '#111',
          color: '#ddd',
          padding: '10px 12px',
          borderRadius: 8,
          fontSize: 13,
        }}
      >

        {/* LAND */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            onClick={() => setShowLand((prev) => !prev)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              color: '#ddd',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            🌍 Land darkness
            <span style={{ opacity: 0.5 }}>{showLand ? '▾' : '▸'}</span>
          </button>

          {showLand && (
            <input
              type="range"
              min="0.3"
              max="1"
              step="0.05"
              value={landDarkness}
              onChange={(e) => setLandDarkness(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          )}
        </div>

      </div>

      {/* 🗺️ Dark map */}
      <DynamicMap
        data={mapData}
        places={placesData}
        center={safeCenter}
        label={label}
        landDarkness={landDarkness}
        waterDarkness={waterDarkness}
      />
    </div>
  )
}
