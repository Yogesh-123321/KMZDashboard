import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useEffect, useMemo, useRef } from "react";
import { createImageThumbnailIcon } from "@/utils/imageThumbnailIcon";
import "leaflet/dist/leaflet.css";

const EDITED_TRACK_COLOR =
  import.meta.env.VITE_EDITED_TRACK_COLOR || "#f97316";

/* ───────── Resize + Fit ───────── */
function MapController({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds || bounds.length < 2) return;
    setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }, 0);
  }, [bounds, map]);

  return null;
}

/* ───────── Freehand Draw ───────── */
function DrawController({ enabled, onDrawCreated }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: true,
        polygon: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: false
    });

    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, e => {
      const coords = e.layer.getLatLngs().map(p => ({
        lat: p.lat,
        lon: p.lng,
        ele: 0
      }));
      onDrawCreated(coords);
      map.removeLayer(e.layer);
      map.removeControl(drawControl);
    });

    return () => {
      map.off(L.Draw.Event.CREATED);
      map.removeControl(drawControl);
    };
  }, [enabled, map, onDrawCreated]);

  return null;
}

/* ───────── Vertex Edit (CORRECT) ───────── */
function EditController({ enabled, polylineRef, onEdited }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || !polylineRef.current) return;

// 🔒 Clone polyline for editing (NEVER edit the real one)
const editLayer = L.polyline(
  polylineRef.current.getLatLngs(),
  polylineRef.current.options
);

const featureGroup = new L.FeatureGroup([editLayer]);
map.addLayer(editLayer);
    map.addLayer(featureGroup);

    const editControl = new L.Control.Draw({
      draw: false,
      edit: {
        featureGroup,
        remove: false
      }
    });

    map.addControl(editControl);

    map.on("draw:edited", e => {
      e.layers.eachLayer(layer => {
        const coords = layer.getLatLngs().map(p => ({
          lat: p.lat,
          lon: p.lng,
          ele: 0
        }));
        onEdited(coords);
      });
    });

   return () => {
  // 🔒 Force Leaflet to commit any pending edits
  featureGroup.eachLayer(layer => {
    if (layer.edited) {
      const coords = layer.getLatLngs().map(p => ({
        lat: p.lat,
        lon: p.lng,
        ele: 0
      }));
      onEdited(coords);
    }
  });

  map.off("draw:edited");
  map.removeControl(editControl);
map.removeLayer(editLayer);
map.removeLayer(featureGroup);
};

  }, [enabled, map, onEdited, polylineRef]);

  return null;
}

/* ───────── MAIN MAP ───────── */
export default function KmzMap({
  tracks,
  points,
  editedTracks,
  trackEditMode,
  onFreehandDraw,
  onVertexEdit,
  onPhotoClick,
   editingPhoto,          // ✅ ADD
  onPhotoDrag,           // ✅ ADD
  onPhotoDragEnd
}) {

/* 🔗 REF TO EDITED POLYLINE */
const editedPolylineRef = useRef(null);
const isPhotoDraggingRef = useRef(false);
const dragMovedRef = useRef(false);
const suppressNextClickRef = useRef(false);
const isDraggingRef = useRef(false);
const suppressClickRef = useRef(false);
const isDark =
  document.documentElement.classList.contains("dark");

/* 🔵 Original tracks */
const originalTracks = useMemo(() => {
  return (tracks || [])
    .map(t => ({
      name: t.name,
      path: (t.coordinates || [])
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
        .map(p => [p.lat, p.lon])
    }))
    .filter(t => t.path.length > 1);
}, [tracks]);


/* 🔲 Fit bounds */
const allBounds = useMemo(() => {
  const b = originalTracks.flatMap(t => t.path);

  editedTracks.forEach(t => {
    if (Array.isArray(t.coordinates)) {
      b.push(...t.coordinates.map(p => [p.lat, p.lon]));
    }
  });

  return b;
}, [originalTracks, editedTracks]);
const activeEditedTrack =
  editedTracks.length > 0
    ? editedTracks[editedTracks.length - 1]
    : null;

  return (
    <div className="absolute inset-0">
      <MapContainer
        center={allBounds[0] || [0, 0]}
        zoom={20}
        style={{ height: "100%", width: "100%" }}
      >
<TileLayer
  url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
   maxZoom={19}
  attribution="© OpenStreetMap contributors, HOT"
/>

        <MapController bounds={allBounds} />

        <DrawController
          enabled={trackEditMode === "freehand"}
          onDrawCreated={onFreehandDraw}
        />

        <EditController
          enabled={trackEditMode === "vertex"}
          polylineRef={editedPolylineRef}
          onEdited={onVertexEdit}
        />
      {/* 🔵 ORIGINAL TRACKS */}
      {originalTracks.map((t, i) => (
        <Polyline
          key={`original-${i}`}
          positions={t.path}
          pathOptions={{ color: "#2563eb", weight: 4 }}
        />
      ))}

      {/* 🟧 EDITED TRACKS (EDITABLE) */}
        {/* 🟧 ALL edited tracks (visual only) */}
        {editedTracks.map(t => (
          <Polyline
            key={t.id}
            positions={t.coordinates.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: "#f97316",
              weight: 4,
              opacity: 0.8,
              dashArray: "6 4"
            }}
          />
        ))}

        {/* 🟣 ACTIVE edited track (editable) */}
        {activeEditedTrack && (
          <Polyline
            key={`active-${activeEditedTrack.id}`}
            ref={editedPolylineRef}
            positions={activeEditedTrack.coordinates.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: "#9333ea",
              weight: 5
            }}
          />
        )}

        {/* 📍 PHOTO MARKERS */}
{/* 📍 PHOTO MARKERS */}
{points?.filter(p =>
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lon)
  )
  .map(photo => (

<Marker
  position={[photo.lat, photo.lon]}
  draggable
  icon={createImageThumbnailIcon(photo.imageUrl)}
  eventHandlers={{
    dragstart: () => {
      isDraggingRef.current = true;
      suppressClickRef.current = true;
    },

    drag: (e) => {
      const { lat, lng } = e.target.getLatLng();

      // ✅ live update WITHOUT touching drag flags
      onPhotoDrag(photo, {
        lat,
        lon: lng
      });
    },

    dragend: (e) => {
      const { lat, lng } = e.target.getLatLng();

      // ✅ final sync (safe)
      onPhotoDrag(photo, {
        lat,
        lon: lng
      });

      isDraggingRef.current = false;

      // 🔑 IMPORTANT: delay clearing suppression
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    },

    click: () => {
      // ❌ ignore drag-generated click
      if (isDraggingRef.current || suppressClickRef.current) return;

      // ✅ real user click
      onPhotoClick(photo);
    }
  }}
/>

))}
      </MapContainer>
    </div>
  );
}