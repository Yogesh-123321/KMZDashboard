import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  useMap,
  LayersControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet-draw";
import { useEffect, useMemo, useRef } from "react";
import "leaflet/dist/leaflet.css";

import { MAP_CONFIG } from "@/config/mapConfig";

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

/* ───────── Vertex Edit ───────── */
function EditController({ enabled, polylineRef, onEdited }) {

  const map = useMap();

  useEffect(() => {

    if (!enabled || !polylineRef.current) return;

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
  editingPhoto,
  onPhotoDrag,
  onPhotoDragEnd
}) {

  const editedPolylineRef = useRef(null);

  const isDraggingRef = useRef(false);
  const suppressClickRef = useRef(false);

  /* 🔵 Original Tracks */
  const originalTracks = useMemo(() => {

    return (tracks || [])
      .map(t => {

        let displayColor = t.color || MAP_CONFIG.TRACKS.reference;

        if (t.name?.toLowerCase().includes("reference")) {
          displayColor = MAP_CONFIG.TRACKS.reference;
        }

        if (t.name?.toLowerCase().includes("recorded")) {
          displayColor = MAP_CONFIG.TRACKS.recorded;
        }

        return {
          name: t.name,
          color: displayColor,
          width: t.width || MAP_CONFIG.TRACK_WIDTH.reference,
          path: (t.coordinates || [])
            .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
            .map(p => [p.lat, p.lon])
        };

      })
      .filter(t => t.path.length > 1);

  }, [tracks]);

  /* Bounds */
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

       <LayersControl position="topright">

  {/* Satellite Base */}
  <LayersControl.BaseLayer checked name="Satellite">
  <TileLayer
  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
  attribution="© OpenTopoMap © OpenStreetMap"
/>
</LayersControl.BaseLayer>

  {/* Streets Base */}
  <LayersControl.BaseLayer name="Streets">
    <TileLayer
      attribution='© OpenStreetMap contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  </LayersControl.BaseLayer>

  

</LayersControl>

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

        {/* Original Tracks */}
        {originalTracks.map((t, i) => (

          <Polyline
            key={`original-${i}`}
            positions={t.path}
            pathOptions={{
              color: t.color,
              weight: t.width
            }}
          />

        ))}

        {/* Edited Tracks */}
        {editedTracks.map(t => (

          <Polyline
            key={t.id}
            positions={t.coordinates.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: MAP_CONFIG.TRACKS.edited,
              weight: MAP_CONFIG.TRACK_WIDTH.edited,
              opacity: 0.8,
              dashArray: "6 4"
            }}
          />

        ))}

        {/* Active Edited Track */}
        {activeEditedTrack && (

          <Polyline
            key={`active-${activeEditedTrack.id}`}
            ref={editedPolylineRef}
            positions={activeEditedTrack.coordinates.map(p => [p.lat, p.lon])}
            pathOptions={{
              color: MAP_CONFIG.TRACKS.edited,
              weight: MAP_CONFIG.TRACK_WIDTH.edited
            }}
          />

        )}

        {/* Photo / Video Markers */}
        {points?.filter(p =>
          Number.isFinite(p.lat) && Number.isFinite(p.lon)
        )
          .map(photo => (

            <Marker
              key={photo._id || `${photo.lat}-${photo.lon}`}
              position={[photo.lat, photo.lon]}
              draggable
              icon={L.divIcon({
                className: "",
                html: `
                <div style="
                  width:30px;
                  height:30px;
                  background:white;
                  border-radius:8px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  box-shadow:0 3px 8px rgba(0,0,0,0.4);
                  font-size:16px;
                ">
                  ${photo.imageUrl ? "📷" : "🎬"}
                </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
              })}

              eventHandlers={{

                dragstart: () => {
                  isDraggingRef.current = true;
                  suppressClickRef.current = true;
                },

                drag: (e) => {

                  const { lat, lng } = e.target.getLatLng();

                  onPhotoDrag(photo, {
                    lat,
                    lon: lng
                  });

                },

                dragend: (e) => {

                  const { lat, lng } = e.target.getLatLng();

                  onPhotoDrag(photo, {
                    lat,
                    lon: lng
                  });

                  isDraggingRef.current = false;

                  setTimeout(() => {
                    suppressClickRef.current = false;
                  }, 50);

                },

                click: () => {

                  if (isDraggingRef.current || suppressClickRef.current) return;

                  onPhotoClick(photo);

                }

              }}

            />

          ))}

      </MapContainer>

    </div>

  );

}