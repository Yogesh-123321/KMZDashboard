import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ───────── FIX MAP SIZE (MODAL SAFE) ───────── */
function FixMapSize() {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timeout);
  }, [map]);

  return null;
}

/* ───────── AUTO FIT BOUNDS ───────── */
function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds.length) return;

    map.fitBounds(bounds, {
      padding: [60, 60],
      maxZoom: 19
    });
  }, [bounds, map]);

  return null;
}

/* ───────── MAIN APPROVAL MAP ───────── */
export default function ApprovalMap({
  trackData,
  deviationPoints = [],
  photos = []
}) {

  /* Safe coordinate normalization */
  const normalize = (p) => {
    const lat = Number(p?.lat);
    const lon = Number(p?.lon);
    if (isNaN(lat) || isNaN(lon)) return null;
    return [lat, lon];
  };

  /* Build bounds from all data */
  const bounds = useMemo(() => {
    const all = [];

   trackData?.referenceTrack?.forEach(segment => {
  segment.forEach(p => {
    const coord = normalize(p);
    if (coord) all.push(coord);
  });
});

trackData?.recordedTrack?.forEach(segment => {
  segment.forEach(p => {
    const coord = normalize(p);
    if (coord) all.push(coord);
  });
});

    deviationPoints.forEach(p => {
      const coord = normalize(p);
      if (coord) all.push(coord);
    });

    photos.forEach(p => {
      const coord = normalize(p);
      if (coord) all.push(coord);
    });

    return all;
  }, [trackData, deviationPoints, photos]);

  const fallbackCenter = [28.6139, 77.2090];

  /* Dynamic color palette for multiple tracks */
  const trackColors = [
    "#2563eb", // blue
    "#dc2626", // red
    "#22c55e", // green
    "#f97316", // orange
    "#9333ea"  // purple
  ];

  return (
    <MapContainer
      center={bounds.length ? bounds[0] : fallbackCenter}
      zoom={18}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={true}
    >
      <FixMapSize />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        maxZoom={19}
      />

      {bounds.length > 0 && <FitBounds bounds={bounds} />}

      {/* 🗺 Render All Tracks with Distinct Colors */}
      {/* 🔵 Reference Track (Blue) */}
{/* 🔵 Reference Tracks */}
{trackData?.referenceTrack?.map((track, index) => (
  <Polyline
    key={`ref-${index}`}
    positions={track.map(p => normalize(p)).filter(Boolean)}
    pathOptions={{
      color: "#2563eb",
      weight: 5
    }}
  />
))}

{/* 🔴 Recorded Tracks */}
{trackData?.recordedTrack?.map((track, index) => (
  <Polyline
    key={`rec-${index}`}
    positions={track.map(p => normalize(p)).filter(Boolean)}
    pathOptions={{
      color: "#dc2626",
      weight: 6
    }}
  />
))}

      {/* 🟡 Deviated Points */}
      {deviationPoints.map((p, i) => {
        const coord = normalize(p);
        if (!coord) return null;

        return (
          <Marker
            key={`dev-${i}`}
            position={coord}
            icon={L.divIcon({
              className: "",
              html: `
                <div style="
                  width:14px;
                  height:14px;
                  background:#facc15;
                  border:2px solid black;
                  border-radius:50%;
                "></div>
              `
            })}
          />
        );
      })}

      {/* 📷 Photo Markers */}
      {photos.map((photo, i) => {
        const coord = normalize(photo);
        if (!coord) return null;

        return (
          <Marker key={`photo-${i}`} position={coord}>
           <Popup>
  <div style={{ width: 300 }}>
    <img
      src={photo.imageUrl}
      alt="Survey"
      style={{
        width: "100%",
        borderRadius: 8,
        marginBottom: 8
      }}
    />

    <div style={{ fontSize: 12, marginBottom: 6 }}>
      {new Date(photo.timestamp).toLocaleString()}
    </div>

    {photo.description && (
      <div style={{
        fontSize: 13,
        fontWeight: 500,
        color: "#333"
      }}>
        {photo.description}
      </div>
    )}
  </div>
</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}