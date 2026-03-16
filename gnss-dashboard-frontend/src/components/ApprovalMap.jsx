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
import "leaflet-measure/dist/leaflet-measure.css";
import "leaflet-measure/dist/leaflet-measure.js";

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

/* ───────── MEASURE TOOL ───────── */
function MeasureControl() {
  const map = useMap();

  useEffect(() => {
    const measureControl = new L.Control.Measure({
      position: "topright",
      primaryLengthUnit: "meters",
      secondaryLengthUnit: "kilometers",
      activeColor: "#2563eb",
      completedColor: "#16a34a"
    });

    map.addControl(measureControl);

    return () => map.removeControl(measureControl);
  }, [map]);

  return null;
}

/* ───────── MAIN APPROVAL MAP ───────── */
export default function ApprovalMap({
  trackData,
  deviationPoints = [],
  photos = []
}) {

  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const [measureRef, setMeasureRef] = useState(null);
  const [measureRec, setMeasureRec] = useState(null);
  const [measureDistance, setMeasureDistance] = useState(null);

  /* Normalize coordinates (supports lon OR lng) */
  const normalize = (p) => {

  const lat = Number(
    p?.lat ??
    p?.latitude ??
    p?.Lat
  );

  const lon = Number(
    p?.lon ??
    p?.lng ??
    p?.longitude ??
    p?.Lon
  );

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return [lat, lon];
};
  /* Extract flat list of points from segmented or flat track */
  const extractPoints = (track) => {
    if (!track) return [];

    if (Array.isArray(track[0])) return track.flat();

    return track;
  };

  /* Collect bounds */
  const bounds = useMemo(() => {

    const all = [];

    extractPoints(trackData?.referenceTrack).forEach(p => {
      const coord = normalize(p);
      if (coord) all.push(coord);
    });

    extractPoints(trackData?.recordedTrack).forEach(p => {
      const coord = normalize(p);
      if (coord) all.push(coord);
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
      scrollWheelZoom
    >

      <FixMapSize />
      <MeasureControl />

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
        maxZoom={19}
      />

      {bounds.length > 0 && <FitBounds bounds={bounds} />}

      {/* 🔵 Reference Tracks */}
      {trackData?.referenceTrack && (() => {

        const segments = Array.isArray(trackData.referenceTrack[0])
          ? trackData.referenceTrack
          : [trackData.referenceTrack];

        return segments.map((track, index) => {

          const coords = track
            ?.map(p => normalize(p))
            .filter(Boolean);

          if (!coords || coords.length < 2) return null;

          return (
            <Polyline
              key={`ref-${index}`}
              positions={coords}
              pathOptions={{
                color: "#2563eb",
                weight: 8
              }}
              interactive
              eventHandlers={{
                click: (e) => {
                  setMeasureRef(e.latlng);
                  setMeasureRec(null);
                  setMeasureDistance(null);
                }
              }}
            />
          );
        });

      })()}

      {/* 🔴 Recorded Tracks */}
      {trackData?.recordedTrack && (() => {

        const segments = Array.isArray(trackData.recordedTrack[0])
          ? trackData.recordedTrack
          : [trackData.recordedTrack];

        return segments.map((track, index) => {

          const coords = track
            ?.map(p => normalize(p))
            .filter(Boolean);

          if (!coords || coords.length < 2) return null;

          return (
            <Polyline
              key={`rec-${index}`}
              positions={coords}
              pathOptions={{
                color: "#dc2626",
                weight: 8
              }}
              interactive
              eventHandlers={{
                click: (e) => {

                  if (!measureRef) {
                    alert("Click reference track first");
                    return;
                  }

                  const rec = e.latlng;
                  const dist = L.latLng(measureRef).distanceTo(rec);

                  setMeasureRec(rec);
                  setMeasureDistance(dist);
                }
              }}
            />
          );
        });

      })()}

      {/* Measurement Line */}
      {measureRef && measureRec && (
        <Polyline
          positions={[
            [measureRef.lat, measureRef.lng],
            [measureRec.lat, measureRec.lng]
          ]}
          pathOptions={{
            color: "green",
            dashArray: "6,6",
            weight: 3
          }}
        />
      )}

      {/* Measurement markers */}
      {measureRef && (
        <Marker position={[measureRef.lat, measureRef.lng]}>
          <Popup>Reference Point</Popup>
        </Marker>
      )}

      {measureRec && (
        <Marker position={[measureRec.lat, measureRec.lng]}>
          <Popup>
            Distance: {measureDistance?.toFixed(2)} m
          </Popup>
        </Marker>
      )}

      {/* 🟡 Deviation Points */}
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

            <Marker
              position={[
                selectedDeviation.projectedLat,
                selectedDeviation.projectedLon
              ]}
              zIndexOffset={1000}
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
                <strong>Deviation:</strong><br/>
                {selectedDeviation.deviation.toFixed(2)} meters
              </Popup>
            </Marker>
          </>
        )}

      {/* 📷 MEDIA MARKERS */}
      {photos.map((photo, i) => {

        const coord = normalize(photo);
        if (!coord) return null;

        return (
          <Marker
            key={`photo-${photo._id || i}`}
            position={coord}
            icon={L.divIcon({
              className: "",
              html: photo.imageUrl ? "📷" : "📍",
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            })}
          >
            <Popup>

              <div style={{ width: 300 }}>

                {photo.imageUrl ? (
                  <img
                    src={photo.imageUrl}
                    alt="Survey"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  />
                ) : photo.videoUrl ? (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      marginBottom: 8
                    }}
                  >
                    <source src={photo.videoUrl} type="video/mp4" />
                  </video>
                ) : (
                  <div style={{ fontSize: 12 }}>No media</div>
                )}

                {photo.description && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginBottom: 4
                    }}
                  >
                    {photo.description.replace("Description:", "").trim()}
                  </div>
                )}

                {photo.timestamp && (
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {new Date(Number(photo.timestamp)).toLocaleString()}
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