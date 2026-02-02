import { useEffect, useState , useRef } from "react";
import { Button } from "@/components/ui/button";
import KmzMap from "@/components/KmzMap";
import { fetchKmzFiles, fetchParsedKmz, parseKmz } from "@/lib/api";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";
import ImagePreview from "@/components/ImagePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function KmzList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activePhoto, setActivePhoto] = useState(null);

  // ─── Track editing state ─────────────────────────
  const [trackEditEnabled, setTrackEditEnabled] = useState(false);
  const [trackEditMode, setTrackEditMode] = useState(null); // "coordinates" | "freehand"
  const [editedTracks, setEditedTracks] = useState([]);
  const [coordInput, setCoordInput] = useState("");
// ─── Photo editing state (SESSION ONLY) ─────────────
const [photoEditEnabled, setPhotoEditEnabled] = useState(false);
const [editingPhoto, setEditingPhoto] = useState(null); // the photo point being edited
const [originalPhotoPosition, setOriginalPhotoPosition] = useState(null);
const [photoLatInput, setPhotoLatInput] = useState("");
const [photoLonInput, setPhotoLonInput] = useState("");
const [editablePoints, setEditablePoints] = useState([]);
const [saveModalOpen, setSaveModalOpen] = useState(false);
const [customFileName, setCustomFileName] = useState("");
const [searchQuery, setSearchQuery] = useState("");
const [globalLoading, setGlobalLoading] = useState(false);
const [loadingText, setLoadingText] = useState("");
// ─── Photo drag preview (LIVE, not saved) ─────────────
const [dragPreview, setDragPreview] = useState(null);
const [didDragPhoto, setDidDragPhoto] = useState(false);
const suppressNextClickRef = useRef(false);
const [hasUnsavedPhotoEdits, setHasUnsavedPhotoEdits] = useState(false);

/*
dragPreview = {
  name: string,
  lat: number,
  lon: number
}
*/

  useEffect(() => {
    fetchKmzFiles()
      .then(setFiles)
      .finally(() => setLoading(false));
  }, []);

function handleSaveEdit() {
  setTrackEditMode(null);
  setTrackEditEnabled(false);
}

function handleResetEdit() {
  if (!parsed?.tracks?.[0]?.coordinates) return;

  setEditedTracks([
    {
      id: "vertex",
      coordinates: parsed.tracks[0].coordinates.map(p => ({
        lat: p.lat,
        lon: p.lon,
        ele: p.ele ?? 0
      }))
    }
  ]);
}

function handleCancelEdit() {
  setEditedTracks([]);
  setTrackEditEnabled(false);
  setTrackEditMode(null);
}


  async function viewOnMap(file) {
   setEditingPhoto(null);
  setActivePhoto(null);
  setOriginalPhotoPosition(null);
  setDragPreview(null);
  setDidDragPhoto(false);

 setHasUnsavedPhotoEdits(false);
  // 🔒 RESET TRACK EDIT STATE
  setTrackEditEnabled(false);
  setTrackEditMode(null);
  setEditedTracks([]);

  setSelected(file);
  setParsed(null);

    await parseKmz(file.id, file.name);

    const maxRetries = 12;
    const delay = 500;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const parsedData = await fetchParsedKmz(file.id);
        setParsed(parsedData);

        // 🔹 ADD THIS LINE
        setEditablePoints(parsedData.points.map(p => ({ ...p })));

        return;

      } catch {
        await new Promise(res => setTimeout(res, delay));
      }
    }

    alert("Parsing is taking too long. Please try again.");
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center text-muted-foreground">
        Loading GNSS data…
      </div>
    );
  }

function handlePhotoDrag(photo, coords) {
  if (!photo || !coords) return;

  const { lat, lon } = coords;

  setDidDragPhoto(true);

  setEditablePoints(prev =>
    prev.map(p =>
      p.name === photo.name ? { ...p, lat, lon } : p
    )
  );

  setDragPreview({
    name: photo.name,
    lat,
    lon
  });

  setPhotoLatInput(lat.toFixed(6));
  setPhotoLonInput(lon.toFixed(6));
}

function handlePhotoDragEnd(photo, coords) {
  setDragPreview(null);

  setTimeout(() => {
    setDidDragPhoto(false);
  }, 0);
}



  return (
    <div className="flex h-full border rounded-xl overflow-hidden">

      {/* ───────────── Sidebar ───────────── */}
      <div
        className={`transition-all duration-300
          ${sidebarOpen ? "w-80" : "w-14"}
          bg-gradient-to-b from-blue-500/10 to-blue-600/5
          backdrop-blur-xl
          border-r border-blue-500/20
          shadow-xl`}
      >
        <div className="flex flex-col h-full">

          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-blue-500/20 shrink-0">
            {sidebarOpen && (
              <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                KMZ Ai Search
              </h3>
            )}
            {sidebarOpen && (
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mt-2 w-full px-2 py-1 text-xs rounded-md
               border border-blue-300
               bg-white/80 dark:bg-black/40
               focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-full bg-blue-500/10 border border-blue-500/30 shadow-md hover:bg-blue-500/20 transition"
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4 text-blue-600" />
              ) : (
                <PanelLeftOpen className="h-4 w-4 text-blue-600" />
              )}
            </button>
          </div>

          {/* File list */}
          {sidebarOpen && (
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
              {files
                .filter(file => {
                  if (!searchQuery.trim()) return true;

                  const tokens = searchQuery
                    .toLowerCase()
                    .split(/\s+/)
                    .filter(Boolean);

                  const fileName = file.name.toLowerCase();

                  return tokens.some(token => fileName.includes(token));
                })
                .map(file => (


                <div
                  key={file.id}
                  className={`p-3 rounded-xl border border-blue-500/20 bg-white/40 dark:bg-black/30 backdrop-blur shadow-sm transition-all
                    ${selected?.id === file.id
                      ? "ring-2 ring-blue-500/50 bg-blue-500/10"
                      : "hover:bg-blue-500/5"
                    }`}
                >
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>

                  {/* Buttons */}
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                        onClick={async () => {
                          setLoadingText("Loading KMZ on map…");
                          setGlobalLoading(true);

                          try {
                            await viewOnMap(file);
                          } finally {
                            setGlobalLoading(false);
                            setLoadingText("");
                          }
                        }}
                    >
                      View on Map
                    </Button>

                    {selected?.id === file.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                          onClick={() => {
                            setTrackEditEnabled(true);
                            setTrackEditMode(null);

                            setEditedTracks(prev => {
                              // if vertex track already exists, do nothing
                              if (prev.find(t => t.id === "vertex")) return prev;

                              const original = parsed?.tracks?.[0]?.coordinates || [];

                              if (original.length < 2) return prev;

                              return [
                                ...prev,
                                {
                                  id: "vertex",
                                  coordinates: original.map(p => ({
                                    lat: p.lat,
                                    lon: p.lon,
                                    ele: p.ele ?? 0
                                  }))
                                }
                              ];
                            });


                        }}

                      >
                        Edit Track
                      </Button>
                    )}
                  </div>

                  {/* Edit options */}
                  {trackEditEnabled && selected?.id === file.id && (
                    <>
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          onClick={() => setTrackEditMode("coordinates")}
                          className={`px-3 py-2 rounded-md text-xs text-left transition
                            ${trackEditMode === "coordinates"
                              ? "bg-blue-600 text-white"
                              : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                            }`}
                        >
                          Edit via Coordinates
                        </button>

                        <button
                          onClick={() => setTrackEditMode("freehand")}
                          className={`px-3 py-2 rounded-md text-xs text-left transition
                            ${trackEditMode === "freehand"
                              ? "bg-green-600 text-white"
                              : "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            }`}
                        >
                          Free Hand Draw
                        </button>
                        <button
                          onClick={() => setTrackEditMode("vertex")}
                          className={`px-3 py-2 rounded-md text-xs text-left transition ${trackEditMode === "vertex"
                              ? "bg-purple-600 text-white"
                              : "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200"
                            }`}

                        >
                          Modify Track Shape
                        </button>
                        {trackEditEnabled && selected?.id === file.id && (
                          <div className="mt-2 flex gap-2">
                              <button
                                onClick={handleSaveEdit}
                                disabled={globalLoading}
                                className={`flex-1 px-3 py-2 text-xs rounded-md
    bg-emerald-600 text-white hover:bg-emerald-700
    ${globalLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  // Reset ONLY the vertex-edited track to original
                                  const original = parsed?.tracks?.[0]?.coordinates || [];

                                  if (original.length < 2) return;

                                  setEditedTracks(prev =>
                                    prev.map(t =>
                                      t.id === "vertex"
                                        ? {
                                          ...t,
                                          coordinates: original.map(p => ({
                                            lat: p.lat,
                                            lon: p.lon,
                                            ele: p.ele ?? 0
                                          }))
                                        }
                                        : t
                                    )
                                  );
                                }}
                                disabled={globalLoading}
                                className="flex-1 px-3 py-2 text-xs rounded-md
    bg-yellow-500 text-white hover:bg-yellow-600"
                              >
                                Reset Vertex
                              </button>

                              <button
                                onClick={handleCancelEdit}
                                disabled={globalLoading}
                                className={`flex-1 px-3 py-2 text-xs rounded-md
    bg-red-600 text-white hover:bg-red-700
    ${globalLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                              >
                                Cancel
                              </button>

                          </div>
                        )}
                        <button
                          onClick={() => {
                            if (!selected) return;
                            setSaveModalOpen(true);
                          }}

                          className="w-full mt-2 px-3 py-2 text-xs rounded-md
             bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Save Edited KMZ (Copy)
                        </button>

                      </div>

                      <p className="mt-2 text-xs text-orange-500 font-semibold">
                        Track edit mode enabled
                      </p>
                    </>
                  )}

                  {/* Coordinate editor */}
                  {trackEditMode === "coordinates" &&
                    trackEditEnabled &&
                    selected?.id === file.id && (
                      <div className="mt-3">
                        <textarea
                          rows={4}
                          placeholder={`Lat, Lon per line\n28.40, 77.32`}
                          value={coordInput}
                          onChange={e => setCoordInput(e.target.value)}
                          className="w-full text-xs p-2 rounded-md border border-blue-300 bg-white/80 dark:bg-black/40"
                        />

                        <button
                          className="mt-2 w-full px-3 py-2 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => {
                            const newTrack = coordInput
                              .split("\n")
                              .map(l => l.trim())
                              .filter(Boolean)
                              .map(l => {
                                const [lat, lon] = l.split(",").map(Number);
                                return Number.isFinite(lat) && Number.isFinite(lon)
                                  ? { lat, lon, ele: 0 }
                                  : null;
                              })
                              .filter(Boolean);

                            if (newTrack.length < 2) {
                              alert("Enter at least two valid coordinates.");
                              return;
                            }

                            setEditedTrack(newTrack);
                          }}
                        >
                          Apply Coordinates
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───────────── Map Area ───────────── */}
      <div className="flex-1 h-full relative bg-gradient-to-br from-blue-50/40 to-transparent dark:from-blue-950/20">
        {!parsed && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Select a KMZ file to visualize GNSS tracks
          </div>
        )}

        {parsed && (
          
          <KmzMap
  key={selected?.id}
  tracks={parsed?.tracks || []}
points={
  editablePoints.length > 0
    ? editablePoints
    : parsed?.points || []
}
  editedTracks={editedTracks}
  trackEditMode={trackEditMode}
 editingPhoto={editingPhoto}
  onFreehandDraw={coords => {
    setEditedTracks(prev => [
      ...prev,
      {
        id: `freehand-${Date.now()}`,
        coordinates: coords
      }
    ]);
    setTrackEditMode(null);
  }}

  onVertexEdit={coords => {
    setEditedTracks(prev => {
      const existing = prev.find(t => t.id === "vertex");
      if (existing) {
        return prev.map(t =>
          t.id === "vertex" ? { ...t, coordinates: coords } : t
        );
      }
      return [...prev, { id: "vertex", coordinates: coords }];
    });
  }}
onPhotoClick={photo => {
  if (hasUnsavedPhotoEdits) {
    alert("You have unsaved photo position changes. Please save the edited KMZ first.");
    return;
  }

  // normal preview behavior
  setActivePhoto(photo);
  setEditingPhoto(photo);

  const original = parsed?.points?.find(
    p => p.name === photo.name
  );

  if (original) {
    setOriginalPhotoPosition({
      lat: original.lat,
      lon: original.lon
    });

    setPhotoLatInput(original.lat.toString());
    setPhotoLonInput(original.lon.toString());
  }
}}

  // 🔴 NEW — drag callbacks
  onPhotoDrag={handlePhotoDrag}
  onPhotoDragEnd={handlePhotoDragEnd}
/>


        )}
      </div>

      <ImagePreview
        photo={activePhoto}
        onClose={() => setActivePhoto(null)}
      />
      {editingPhoto && (
  <div
    className="fixed bottom-6 right-6 z-[9999] w-64
               bg-white dark:bg-black
               border border-blue-500/30
               rounded-xl p-3 shadow-2xl"
  >
    <p className="text-sm font-semibold text-blue-600 mb-2">
      Edit Photo Position
    </p>

    <div className="space-y-2">
      <input
        type="text"
        placeholder="Latitude"
        value={photoLatInput}
        onChange={e => setPhotoLatInput(e.target.value)}
        className="w-full px-2 py-1 text-xs rounded border
                   bg-white dark:bg-black"
      />

      <input
        type="text"
        placeholder="Longitude"
        value={photoLonInput}
        onChange={e => setPhotoLonInput(e.target.value)}
        className="w-full px-2 py-1 text-xs rounded border
                   bg-white dark:bg-black"
      />
    </div>

    <div className="mt-3 flex gap-2">
      <button
  className="flex-1 text-xs px-2 py-1 rounded
             bg-blue-600 text-white hover:bg-blue-700"
  onClick={() => {
    const lat = Number(photoLatInput.trim());
const lon = Number(photoLonInput.trim());

if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
  alert("Please enter valid numeric latitude and longitude");
  return;
}

setEditablePoints(prev => {
  if (!Array.isArray(prev)) return prev;

  return prev.map(p =>
    p.name === editingPhoto.name
      ? { ...p, lat, lon }
      : p
  );
});

// keep editor state in sync
setEditingPhoto(prev => ({
  ...prev,
  lat,
  lon
}));
  }}
>
  Apply
</button>


      <button
  className="flex-1 text-xs px-2 py-1 rounded
             bg-yellow-500 text-white hover:bg-yellow-600"
  onClick={() => {
    if (!originalPhotoPosition) return;

   if (!originalPhotoPosition || !editingPhoto) return;

setEditablePoints(prev => {
  if (!Array.isArray(prev)) return prev;

  return prev.map(p =>
    p.name === editingPhoto.name
      ? { ...p, ...originalPhotoPosition }
      : p
  );
});

// sync UI
setPhotoLatInput(originalPhotoPosition.lat.toString());
setPhotoLonInput(originalPhotoPosition.lon.toString());

// sync editing reference
setEditingPhoto(prev => ({
  ...prev,
  ...originalPhotoPosition
}));




console.log("editablePoints before apply:", editablePoints);

    setPhotoLatInput(originalPhotoPosition.lat.toString());
    setPhotoLonInput(originalPhotoPosition.lon.toString());
  }}
>
  Reset
</button>


      <button
        onClick={() => {
          setEditingPhoto(null);
          setOriginalPhotoPosition(null);
        }}
        className="flex-1 text-xs px-2 py-1 rounded
                   bg-red-600 text-white hover:bg-red-700"
      >
        Cancel
      </button>
    </div>
  </div>
)}

{/* ───────── Save KMZ with Custom Name Modal ───────── */}
<Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Save Edited KMZ</DialogTitle>
      <DialogDescription>
        Enter a custom name for the new KMZ file
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-2">
      <Input
        placeholder="e.g. highway-survey-day-1"
        value={customFileName}
        onChange={(e) => setCustomFileName(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        “.kmz” will be added automatically
      </p>
    </div>

    <div className="flex justify-end gap-2 mt-4">
      <Button
        variant="outline"
        onClick={() => {
          setSaveModalOpen(false);
          setCustomFileName("");
        }}
      >
        Cancel
      </Button>

      <Button
  disabled={!customFileName.trim()}
  onClick={async () => {
    if (!selected) return;

    setLoadingText("Saving edited KMZ…");
    setGlobalLoading(true);

    try {
     const payload = {
  editedTracks: editedTracks.map((t, index) => ({
    name: t.name || `Edited Track ${index + 1}`,
    coordinates: t.coordinates
  })),
  editedPoints: editablePoints.map(p => ({
    name: p.name,
    lat: p.lat,
    lon: p.lon,
    ele: p.ele ?? 0
  })),
  fileName: customFileName.trim()
};



      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/kmz/${selected.id}/save-copy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

    if (!res.ok) throw new Error("Save failed");

    const data = await res.json();

    await parseKmz(data.file.id, data.file.name);
    const parsedData = await fetchParsedKmz(data.file.id);

    setSelected({ id: data.file.id, name: data.file.name });
    setParsed(parsedData);
    setEditablePoints(parsedData.points.map(p => ({ ...p })));
    fetchKmzFiles().then(setFiles);

setEditedTracks([]);
    setTrackEditEnabled(false);
    setTrackEditMode(null);
    setSaveModalOpen(false);
    setCustomFileName("");

  } catch (err) {
    console.error(err);
    alert("Failed to save edited KMZ");
  } finally {
    setGlobalLoading(false);
    setLoadingText("");
  }
}}

      >
        Save KMZ
      </Button>
    </div>
  </DialogContent>
</Dialog>

{/* Loading Spinner */}
{globalLoading && (
  <div className="fixed inset-0 z-[10000]
                  flex flex-col items-center justify-center
                  bg-black/40 backdrop-blur-sm">
    
    {/* Spinner */}
    <div className="h-12 w-12 rounded-full
                    border-4 border-white/30
                    border-t-white
                    animate-spin" />

    {/* Text */}
    <p className="mt-4 text-sm text-white font-medium">
      {loadingText || "Processing…"}
    </p>
  </div>
)}

    </div>
  );
}