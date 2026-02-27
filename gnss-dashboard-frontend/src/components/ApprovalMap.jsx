import { useEffect, useMemo, useState } from "react";
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

  const [selectedDeviation, setSelectedDeviation] = useState(null);

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

      {/* 🟡 Clickable Deviation Points */}
      {deviationPoints.map((p, i) => {
        const coord = normalize(p);
        if (!coord) return null;

        return (
          <Marker
            key={`dev-${i}`}
            position={coord}
            eventHandlers={{
              click: () => setSelectedDeviation(p)
            }}
            icon={L.divIcon({
              className: "",
              html: `
                <div style="
                  width:14px;
                  height:14px;
                  background:#facc15;
                  border:2px solid black;
                  border-radius:50%;
                  cursor:pointer;
                "></div>
              `
            })}
          />
        );
      })}

      {/* 🟢 Selected Deviation Vector */}
      {selectedDeviation &&
        selectedDeviation.projectedLat &&
        selectedDeviation.projectedLon && (
          <>
            <Polyline
              positions={[
                [selectedDeviation.lat, selectedDeviation.lon],
                [
                  selectedDeviation.projectedLat,
                  selectedDeviation.projectedLon
                ]
              ]}
              pathOptions={{
                color: "green",
                dashArray: "6,6",
                weight: 3
              }}
            />

            {/* Projected reference point */}
            <Marker
              position={[
                selectedDeviation.projectedLat,
                selectedDeviation.projectedLon
              ]}
              icon={L.divIcon({
                className: "",
                html: `
                  <div style="
                    width:12px;
                    height:12px;
                    background:green;
                    border:2px solid white;
                    border-radius:50%;
                  "></div>
                `
              })}
            >
              <Popup>
                <div>
                  <strong>Deviation:</strong><br/>
                  {selectedDeviation.deviation.toFixed(2)} meters
                </div>
              </Popup>
            </Marker>
          </>
        )}

      {/* 📷 Photo Markers */}
      {photos.map((photo, i) => {
        const coord = normalize(photo);
        if (!coord) return null;

        return (
          <Marker key={`photo-${i}`} position={coord}>
            <Popup>
              <div style={{ width: 300 }}>
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL}${photo.imageUrl}`}
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