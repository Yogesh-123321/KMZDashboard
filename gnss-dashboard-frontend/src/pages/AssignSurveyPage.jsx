import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Tooltip
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AssignSurveyPage({ selectedFile }) {

  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [assignLoading, setAssignLoading] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    userId: null
  });
  const [overloadDialog, setOverloadDialog] = useState({
    open: false,
    userId: null,
    pending: 0
  });
  const [selectedSegment, setSelectedSegment] = useState(0);
  const [segmentLengths, setSegmentLengths] = useState([2]); // start with 1 segment of 2km
const [batchId, setBatchId] = useState(null);
/* ───────── Load Users ───────── */
useEffect(() => { // start with 1 segment of 2km  useEffect(() => {

  fetch(`${API_BASE_URL}/api/admin/users`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  })
    .then(r => r.json())
    .then(data => {
      setUsers(data.filter(u => u.role !== "ADMIN"));
    })
    .catch(() => {
      toast.error("Failed to load users");
    });

}, []);

/* ───────── Load Assignments ───────── */

useEffect(() => {

  fetch(`${API_BASE_URL}/api/assignments/all`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  })
    .then(r => r.json())
    .then(data => setAssignments(data))
    .catch(() => {
      toast.error("Failed to load assignments");
    });

}, []);

/* ───────── Load KMZ Preview ───────── */

useEffect(() => {

  if (!selectedFile) return;

  const surveyId =
    selectedFile.driveFileId || selectedFile.id;

  setLoadingPreview(true);
  setPreviewData(null);

  fetch(`${API_BASE_URL}/api/kmz/${surveyId}/preview`, {
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  })
    .then(r => r.json())
    .then(data => setPreviewData(data))
    .catch(() => {
      toast.error("Failed to load map preview");
    })
    .finally(() => setLoadingPreview(false));

}, [selectedFile]);

useEffect(() => {
  if (!selectedFile) return;

  const surveyId = selectedFile.driveFileId || selectedFile.id;

  setBatchId(prev => prev || `${surveyId}_${Date.now()}`);

}, [selectedFile]);

/* ───────── Assign Survey ───────── */

async function assignSurvey(userId) {

  if (!selectedFile) {
    toast.warning("Select a KMZ file first");
    return;
  }

  if (!previewData) {
    toast.warning("Wait for map preview to load");
    return;
  }

  const surveyId =
    selectedFile.driveFileId || selectedFile.id;

  try {

    setAssignLoading(userId);

    const segmentIndex = selectedSegment;

    const res = await fetch(
      `${API_BASE_URL}/api/assignments/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          surveyId,
          surveyName: selectedFile.name,
          userId,

          assignmentGroupId: batchId,   // ⭐ ADD THIS

          segmentIndex,
          totalSegments: segments.length,

          segmentTracks: segments[segmentIndex]?.tracks?.map(track =>
            track.coordinates.map(p => ({
              lat: p.lat,
              lon: p.lon
            }))
          )
        })
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Assignment failed");
    }

    toast.success("Segment assigned successfully");

    const refreshed = await fetch(
      `${API_BASE_URL}/api/assignments/all`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    setAssignments(await refreshed.json());

  } catch (err) {

    toast.error(err.message);

  } finally {

    setAssignLoading(null);

  }

}

/* ───────── Unassign Survey ───────── */

async function confirmUnassign() {

  const userId = confirmDialog.userId;

  const surveyId =
    selectedFile.driveFileId || selectedFile.id;

  const assignment = assignments.find(
  a =>
    a.assignmentGroupId === batchId &&
    a.segmentIndex === selectedSegment &&
    (a.assignedTo?._id === userId || a.assignedTo === userId)
);
  if (!assignment) {
    toast.error("Assignment not found");
    return;
  }

  try {

    setAssignLoading(userId);

    const res = await fetch(
      `${API_BASE_URL}/api/assignments/${assignment._id}/unassign`,
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    if (!res.ok) throw new Error("Failed to unassign survey");

    toast.success("Survey unassigned");

    const refreshed = await fetch(
      `${API_BASE_URL}/api/assignments/all`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    setAssignments(await refreshed.json());

  } catch (err) {
    toast.error(err.message);
  } finally {
    setAssignLoading(null);
    setConfirmDialog({ open: false, userId: null });
  }

}

/* ───────── Compute Assigned Users ───────── */

const surveyId =
  selectedFile?.driveFileId || selectedFile?.id;

const assignedUserIds = assignments
  .filter(a =>
    a.assignmentGroupId === batchId &&
    a.segmentIndex === selectedSegment &&
    a.status !== "approved"
  )
  .map(a => {
    if (!a.assignedTo) return null;
    if (typeof a.assignedTo === "object") {
      return a.assignedTo?._id;
    }
    return a.assignedTo;
  })
  .filter(Boolean);
const segmentAlreadyAssigned =
  assignments.find(
    a =>
      a.assignmentGroupId === batchId &&
      a.segmentIndex === selectedSegment &&
      a.status !== "approved"
  ) || null;
const allTracks = previewData?.tracks || [];
function haversineDistance(p1, p2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;

  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);

  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
/* ---------- Survey Length ---------- */

let surveyLength = 0;

allTracks.forEach(track => {
  const coords = track.coordinates;

  for (let i = 1; i < coords.length; i++) {
    surveyLength += haversineDistance(coords[i - 1], coords[i]);
  }
});

const surveyKm = (surveyLength / 1000).toFixed(2);

/* ---------- Default Segment Length ---------- */

const defaultSegmentKm = 2;

/* ---------- Segment Length Array ---------- */

const lengths =
  segmentLengths.length > 0
    ? segmentLengths
    : [defaultSegmentKm];

/* ---------- Dynamic Segmentation ---------- */

const segments = [];

let segmentIndex = 0;
let currentTarget = (lengths[segmentIndex] || defaultSegmentKm) * 1000;

let currentDistance = 0;

let currentSegmentTracks = [];
let currentTrackCoords = [];

for (const track of allTracks) {

  const coords = track.coordinates;

  currentTrackCoords = [coords[0]];

  for (let i = 1; i < coords.length; i++) {

    const prev = coords[i - 1];
    const curr = coords[i];

    const stepDistance = haversineDistance(prev, curr);

    currentDistance += stepDistance;

    currentTrackCoords.push(curr);

    if (currentDistance >= currentTarget) {

      currentSegmentTracks.push({
        name: track.name,
        coordinates: currentTrackCoords
      });

      segments.push({
        tracks: [...currentSegmentTracks]
      });

      /* reset segment */

      segmentIndex++;

      currentTarget =
        (lengths[segmentIndex] || defaultSegmentKm) * 1000;

      currentDistance = 0;

      currentSegmentTracks = [];

      currentTrackCoords = [curr];
    }
  }

  if (currentTrackCoords.length > 1) {
    currentSegmentTracks.push({
      name: track.name,
      coordinates: currentTrackCoords
    });
  }
}

/* ---------- Final leftover segment ---------- */

if (currentSegmentTracks.length > 0) {
  segments.push({
    tracks: currentSegmentTracks
  });
}

console.log("SEGMENTS GENERATED:", segments.length);
console.log(segments);
const pendingCounts = {};

assignments.forEach(a => {

  if (a.status === "pending" && a.assignedTo) {

    const userId =
      typeof a.assignedTo === "object"
        ? a.assignedTo._id
        : a.assignedTo;

    if (!pendingCounts[userId]) {
      pendingCounts[userId] = 0;
    }

    pendingCounts[userId]++;

  }

});
const segmentColors = [
  "#16a34a",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#6366f1"
];
return (
  <div className="h-full overflow-y-auto border rounded-lg p-4 space-y-4">

    <div className="text-lg font-semibold">
      Assign Survey
    </div>

    {!selectedFile && (
      <div className="text-sm text-muted-foreground">
        Select a KMZ file from Explorer first
      </div>
    )}

    {selectedFile && (
      <>
        <div className="text-sm border rounded p-2 bg-muted/30">
          Selected Survey: <b>{selectedFile.name}</b>
          <div className="text-xs text-muted-foreground">
            Survey length: <b>{surveyKm} km</b>
          </div>
          <div className="text-xs text-orange-500">
            Segments created: <b>{segments.length}</b>
          </div>
          <div className="flex gap-3 flex-wrap mt-1">

  {segmentLengths.map((len, i) => (
    <div key={i} className="flex items-center gap-1 text-xs">

      Seg {i + 1}

      <input
        type="number"
        step="0.1"
        min="0.1"
        className="w-16 border rounded px-1 py-0.5"
        value={len}
        onChange={(e) => {
          const updated = [...segmentLengths];
          updated[i] = Number(e.target.value);
          setSegmentLengths(updated);
        }}
      />

      km

    </div>
  ))}

  <Button
    size="sm"
    variant="outline"
    onClick={() =>
      setSegmentLengths([...segmentLengths, defaultSegmentKm])
    }
  >
    + Segment
  </Button>

</div>
          <div className="flex gap-2 flex-wrap">
            {segments.map((_, i) => (
              <Button
                key={i}
                size="sm"
                variant={selectedSegment === i ? "default" : "outline"}
                onClick={() => setSelectedSegment(i)}
              >
                Segment {i + 1}
              </Button>
            ))}
          </div>
        </div>

        {/* MAP PREVIEW LOADING */}
        {loadingPreview && (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading map preview...
          </div>
        )}

        {allTracks.length > 0 && (
          <div className="h-64 border rounded overflow-hidden">
            <MapContainer
              style={{ height: "100%", width: "100%" }}
              center={[
                allTracks[0].coordinates[0].lat,
                allTracks[0].coordinates[0].lon
              ]}
              zoom={16}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {segments.length > 0 ? (
                segments.map((segment, sIndex) =>
                  segment.tracks.map((track, tIndex) => (
                    <Polyline
                      key={`seg-${sIndex}-${tIndex}`}
                      positions={track.coordinates.map(p => [p.lat, p.lon])}
                      color={segmentColors[sIndex % segmentColors.length]}
                      weight={selectedSegment === sIndex ? 8 : 4}
                    >
                      <Tooltip sticky>
                        Segment {sIndex + 1}
                        <br />
                        Target length: {(lengths[sIndex] ?? defaultSegmentKm).toFixed(2)} km
                      </Tooltip>
                    </Polyline>
                  ))
                )
              ) : (
                allTracks.map((track, index) => (
                  <Polyline
                    key={index}
                    positions={track.coordinates.map(p => [
                      p.lat,
                      p.lon
                    ])}
                    color={
                      track.name?.includes("Edited")
                        ? "green"
                        : "blue"
                    }
                  />
                ))
              )}
            </MapContainer>
          </div>
        )}
      </>
    )}

    {/* USER GRID */}

    <div className="border rounded-lg p-4 grid grid-cols-3 gap-4">

      {users.map(user => {

        const isAssigned =
          assignedUserIds.includes(user._id);

        return (
          <div
            key={user._id}
            className={`border rounded-lg p-4 shadow-sm flex flex-col items-center text-center space-y-2 hover:shadow-md transition ${(pendingCounts[user._id] || 0) >= 5 ? "border-orange-400" : ""
              }`}            >

            <div className="font-semibold text-sm">
              {user.username}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.role}
            </div>

            <div className="text-xs">
              Pending: {pendingCounts[user._id] || 0}
              {(pendingCounts[user._id] || 0) >= 5 && (
                <span className="text-orange-500 ml-1">⚠</span>
              )}
            </div>

            {isAssigned ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={assignLoading === user._id}
                onClick={() =>
                  setConfirmDialog({
                    open: true,
                    userId: user._id
                  })
                }
              >
                {assignLoading === user._id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Unassign
              </Button>
            ) : (
              <Button
                size="sm"
                  disabled={
                    !previewData ||
                    assignLoading === user._id ||
                    (segmentAlreadyAssigned && !isAssigned)
                  }
                onClick={() => {

                  const pending = pendingCounts[user._id] || 0;

                  if (pending >= 5) {
                    setOverloadDialog({
                      open: true,
                      userId: user._id,
                      pending
                    });
                    return;
                  }

                  assignSurvey(user._id);
                }}          >
                {assignLoading === user._id && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Assign
              </Button>
            )}

          </div>
        );
      })}

    </div>

    {/* CONFIRM UNASSIGN DIALOG */}

    <Dialog
      open={confirmDialog.open}
      onOpenChange={(v) =>
        setConfirmDialog({ open: v, userId: null })
      }
    >
      <DialogContent>

        <DialogHeader>
          <DialogTitle>Unassign Survey?</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This will remove the survey from the user.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() =>
              setConfirmDialog({ open: false, userId: null })
            }
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            onClick={confirmUnassign}
          >
            Unassign
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
    {/* OVERLOAD WARNING DIALOG */}

    <Dialog
      open={overloadDialog.open}
      onOpenChange={(v) =>
        setOverloadDialog({ open: v, userId: null, pending: 0 })
      }
    >
      <DialogContent>

        <DialogHeader>
          <DialogTitle>Surveyor Workload Warning</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This surveyor already has <b>{overloadDialog.pending}</b> pending assignments.
          Assigning more work may delay completion.
        </p>

        <DialogFooter>

          <Button
            variant="outline"
            onClick={() =>
              setOverloadDialog({ open: false, userId: null, pending: 0 })
            }
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              assignSurvey(overloadDialog.userId);
              setOverloadDialog({ open: false, userId: null, pending: 0 });
            }}
          >
            Assign Anyway
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  </div>
);
}