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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ───────── Simple Spinner ───────── */
function Spinner() {
  return (
    <div className="flex justify-center items-center py-6">
      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

/* ───────── Auto Fit Bounds ───────── */
function FitBounds({ bounds }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds.length) return;
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19 });
  }, [bounds, map]);

  return null;
}

/* ───────── Force Resize After Modal Mount ───────── */
function ResizeFix() {
  const map = useMap();

  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timeout);
  }, [map]);

  return null;
}

/* ───────── Simple SVG Gauge ───────── */
function DeviationGauge({ percent }) {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (percent / 100) * circumference;

  let color = "#16a34a";
  if (percent > 15) color = "#dc2626";
  else if (percent > 5) color = "#f97316";

  return (
    <div className="flex flex-col items-center">
      <svg height={160} width={160}>
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="80"
          cy="80"
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + " " + circumference}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="80"
          cy="80"
        />
        <text
  x="50%"
  y="50%"
  dominantBaseline="middle"
  textAnchor="middle"
  fontSize="20"
  fontWeight="bold"
  fill="currentColor"
>
  {percent?.toFixed(1)}%
</text>
      </svg>
    </div>
  );
}

/* ───────── Approval Map ───────── */
function ApprovalMap({ trackData, deviationPoints = [], photos = []  }) {
  const [selectedDeviation, setSelectedDeviation] = useState(null);
  const normalize = (p) => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    
    if (isNaN(lat) || isNaN(lon)) return null;
    return [lat, lon];
  };

 const bounds = useMemo(() => {
  const all = [];

  trackData?.referenceTrack?.forEach(segment => {
    segment?.forEach(p => {
      const coord = normalize(p);
      if (coord) all.push(coord);
    });
  });

  trackData?.recordedTrack?.forEach(segment => {
    segment?.forEach(p => {
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

  return (
    <MapContainer
      center={bounds[0] || [20.5937, 78.9629]}
      zoom={18}
      style={{ height: "100%", width: "100%" }}
    >
      <ResizeFix />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {bounds.length > 0 && <FitBounds bounds={bounds} />}

      {/* Tracks */}
   {/* 🔵 Reference Tracks */}
{trackData?.referenceTrack?.map((segment, index) => (
  <Polyline
    key={`ref-${index}`}
    positions={segment
      ?.map(p => normalize(p))
      .filter(Boolean)}
    pathOptions={{
      color: "#2563eb",
      weight: 5,
      opacity: 0.9
    }}
  />
))}

{/* 🔴 Recorded Tracks */}
{trackData?.recordedTrack?.map((segment, index) => (
  <Polyline
    key={`rec-${index}`}
    positions={segment
      ?.map(p => normalize(p))
      .filter(Boolean)}
    pathOptions={{
      color: "#dc2626",
      weight: 6,
      opacity: 0.9
    }}
  />
))}
      {/* Severity Colored Deviation Points */}
      {deviationPoints.map((p, i) => {
        const coord = normalize(p);
        if (!coord) return null;

        let color = "#16a34a";
        if (p.deviation > 10) color = "#dc2626";
        else if (p.deviation > 3) color = "#f97316";

        return (
          <Marker
  key={i}
  position={coord}
  eventHandlers={{
    click: () => {
      console.log("Clicked deviation:", p);
      setSelectedDeviation(p);
    }
  }}
  icon={L.divIcon({
    html: `
      <div style="
        width:12px;
        height:12px;
        background:${color};
        border:2px solid black;
        border-radius:50%;
        cursor:pointer;
      "></div>
    `
  })}
/>
        );
      })}
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
      icon={L.divIcon({
        html: `
          <div style="
            width:10px;
            height:10px;
            background:green;
            border-radius:50%;
            border:2px solid white;
          "></div>
        `
      })}
    >
      <Popup>
        <div>
          <strong>Deviation:</strong><br/>
          {selectedDeviation.deviation?.toFixed(2)} m
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
        <div style={{ width: 280 }}>
          <img
            src={photo.imageUrl}
            alt="Survey"
            style={{
              width: "100%",
              borderRadius: 8,
              marginBottom: 8
            }}
          />
          <div style={{ fontSize: 12 }}>
            {photo.description && (
              <div>
                <strong>Description:</strong> {photo.description}
              </div>
            )}
            {photo.timestamp && (
              <div>
                {new Date(Number(photo.timestamp)).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
})}
    </MapContainer>
  );
}

/* ───────── Main Page ───────── */
export default function ApprovalPage() {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [threshold, setThreshold] = useState(3);
  const [trackData, setTrackData] = useState(null);
  const [deviationData, setDeviationData] = useState(null);
const [aiAnalysis, setAiAnalysis] = useState(null);
const [loadingAssignments, setLoadingAssignments] = useState(false);
const [loadingMap, setLoadingMap] = useState(false);
const [approving, setApproving] = useState(false);
  async function loadAssignments() {
  setLoadingAssignments(true);
  const res = await fetch(
    `${API_BASE_URL}/api/assignments/approval-queue`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
  );
  setAssignments(await res.json());
  setLoadingAssignments(false);
}
  async function loadMapData(id, th) {
  setLoadingMap(true);

  const token = localStorage.getItem("token");

  try {
    const trackRes = await fetch(
      `${API_BASE_URL}/api/assignments/${id}/track`,
      { headers: { Authorization: "Bearer " + token } }
    );

    setTrackData(await trackRes.json());

    const devRes = await fetch(
      `${API_BASE_URL}/api/assignments/${id}/deviation-analysis?threshold=${th}`,
      { headers: { Authorization: "Bearer " + token } }
    );

    if (!devRes.ok) {
      setDeviationData(null);
      setAiAnalysis(null);
      return;
    }

    const devJson = await devRes.json();
    setDeviationData(devJson);

    const aiRes = await fetch(
      `${API_BASE_URL}/api/assignments/${id}/ai-analysis?threshold=${th}`,
      { headers: { Authorization: "Bearer " + token } }
    );

    if (aiRes.ok) {
      const aiJson = await aiRes.json();
      setAiAnalysis(aiJson.aiAnalysis);
    } else {
      setAiAnalysis(null);
    }
  } finally {
    setLoadingMap(false);
  }
}

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
const [finalFileName, setFinalFileName] = useState("");

async function approveAssignment(id, finalName) {
  if (!finalName || !finalName.trim()) {
    alert("Final file name is required");
    return;
  }

  setApproving(true);

  const token = localStorage.getItem("token");

  const res = await fetch(
    `${API_BASE_URL}/api/assignments/${id}/approve`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify({
        finalName: finalName.trim()
      })
    }
  );

  setApproving(false);

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Approval failed");
    return;
  }

  setApproveDialogOpen(false);
  setSelectedAssignment(null);
  await loadAssignments();
}

  useEffect(() => {
    loadAssignments();
  }, []);

  const deviationPercent = deviationData?.deviationPercent || 0;

  let qualityLabel = "";
  let qualityColor = "";

  if (deviationPercent < 5) {
    qualityLabel = "Excellent";
    qualityColor = "bg-green-600";
  } else if (deviationPercent < 15) {
    qualityLabel = "Acceptable";
    qualityColor = "bg-yellow-500";
  } else {
    qualityLabel = "Rejected Quality";
    qualityColor = "bg-red-600";
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-semibold">
        Approval Queue
      </div>

      {/* TABLE */}
      <div className="bg-card border rounded-xl p-4">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-2">Survey</th>
              <th>Surveyor</th>
              <th>Status</th>
            </tr>
          </thead>
         <tbody>
  {loadingAssignments ? (
    <tr>
      <td colSpan="3">
        <Spinner />
      </td>
    </tr>
  ) : assignments.length === 0 ? (
    <tr>
      <td colSpan="3" className="text-center py-6 text-muted-foreground">
        No assignments available
      </td>
    </tr>
  ) : (
    assignments.map(a => (
      <tr
        key={a._id}
        className="border-b cursor-pointer hover:bg-muted/40"
        onClick={async () => {
          setSelectedAssignment(a);
          await loadMapData(a._id, threshold);
        }}
      >
        <td>{a.surveyName}</td>
        <td>{a.assignedTo?.username}</td>
        <td>{a.status}</td>
      </tr>
    ))
  )}
</tbody>
        </table>
      </div>

      {/* CONSOLE */}
      {selectedAssignment && (
        <div className="fixed inset-0 bg-black/70 z-50">
<div className="absolute inset-4 bg-card border rounded-2xl p-6 flex flex-col h-full max-h-[calc(100vh-2rem)] overflow-hidden">
            <div className="flex justify-between mb-4">
              <div className="text-xl font-semibold">
                Approval Console — {selectedAssignment.surveyName}
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-3 py-1 border rounded"
              >
                Close
              </button>
            </div>

<div className="flex flex-1 gap-4 min-h-0">
              <div className="flex-1 border rounded-xl overflow-hidden">
                <ApprovalMap
key={
  selectedAssignment?._id +
  "_" +
  (trackData?.referenceTrack?.length || 0) +
  "_" +
  (trackData?.recordedTrack?.length || 0)
}                  trackData={trackData}
                  deviationPoints={deviationData?.deviations || []}
                  photos={trackData?.photos || []}
                />
              </div>

<div className="w-[350px] bg-muted/20 border rounded-xl p-4 flex flex-col space-y-6 overflow-y-auto min-h-0">
                {/* Threshold Slider */}
                <div>
                  <div className="font-semibold mb-2">
                    Threshold: {threshold} m
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={threshold}
                    onChange={(e) => {
                      const newVal = Number(e.target.value);
                      setThreshold(newVal);
                      loadMapData(selectedAssignment._id, newVal);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Quality Badge */}
                {deviationData && (
                  <div className={`text-white text-center py-2 rounded-lg ${qualityColor}`}>
                    {qualityLabel}
                  </div>
                )}

                {/* Gauge */}
                {deviationData && (
                  <DeviationGauge percent={deviationPercent} />
                )}
                {aiAnalysis && (
  <div className="border rounded-xl p-4 bg-card text-foreground space-y-4">

    <div className="flex justify-between items-center">
      <div className="text-lg font-semibold">
        AI Quality Assessment
      </div>

      <div className="text-sm px-3 py-1 rounded-full bg-muted">
        Confidence: {aiAnalysis.confidenceScore}%
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2 text-sm">
      <div>
        <span className="font-medium">Classification:</span><br />
        {aiAnalysis.classification}
      </div>

      <div>
        <span className="font-medium">Severity:</span><br />
        {aiAnalysis.severity}
      </div>
    </div>

    <div className="text-sm">
      <span className="font-medium">Recommendation:</span>{" "}
      {aiAnalysis.recommendation}
    </div>

    <div className="border-t pt-3 text-sm text-muted-foreground">
      {aiAnalysis.summary}
    </div>

  </div>
)}
                {/* Stats */}
                {deviationData && (
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Total Points</span>
                      <span>{deviationData.totalPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deviated Points</span>
                      <span>{deviationData.deviatedPoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Deviation</span>
                      <span>{deviationData.maxDeviation?.toFixed(2)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Deviation</span>
                      <span>{deviationData.avgDeviation?.toFixed(2)} m</span>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS — UNCHANGED */}
                <div className="mt-auto space-y-3">
                  <Button
  className="w-full"
  onClick={() => {
    const baseName = selectedAssignment.surveyName.replace(".kmz", "");
    setFinalFileName(`Approved_${baseName}`);
    setApproveDialogOpen(true);
  }}
>
  Approve
</Button>

                 <button
  onClick={() =>
    rejectAssignment(selectedAssignment._id)
  }
  className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
>
  Reject & Return to Surveyor
</button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Approve Assignment</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Enter final KMZ file name
      </div>

      <Input
        value={finalFileName}
        onChange={(e) => setFinalFileName(e.target.value)}
        placeholder="Final file name"
      />

      <div className="text-xs text-muted-foreground">
        Final file will be saved as: <b>{finalFileName}.kmz</b>
      </div>
    </div>

    <DialogFooter className="gap-2">
      <Button
        variant="outline"
        onClick={() => setApproveDialogOpen(false)}
      >
        Cancel
      </Button>

      <Button
        onClick={() =>
          approveAssignment(
            selectedAssignment._id,
            finalFileName
          )
        }
      >
        Confirm Approval
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}