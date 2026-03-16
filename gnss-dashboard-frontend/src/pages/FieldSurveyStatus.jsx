import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* Fix Leaflet default icon */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* Force map resize */
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

/* Auto-fit bounds */
function FitBounds({ surveyors }) {
  const map = useMap();
  const [hasFitted, setHasFitted] = useState(false);

  useEffect(() => {
    if (hasFitted) return;

    const points = surveyors
      .filter(s => s.lastLocation)
      .map(s => [s.lastLocation.lat, s.lastLocation.lng]);

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
      setHasFitted(true);
    }
  }, [surveyors, map, hasFitted]);

  return null;
}

/* Spinner */
function Spinner({ small = false }) {
  return (
    <div className="flex justify-center items-center">
      <div
        className={`border-4 border-primary border-t-transparent rounded-full animate-spin ${
          small ? "w-4 h-4" : "w-8 h-8"
        }`}
      />
    </div>
  );
}

/* Activity color helper */

function getActivityColor(action = "") {

  const a = action.toLowerCase();

  if (a.includes("assign"))
    return "bg-blue-100 text-blue-700 border-blue-300";

  if (a.includes("start") || a.includes("progress"))
    return "bg-orange-100 text-orange-700 border-orange-300";

  if (a.includes("complete"))
    return "bg-green-100 text-green-700 border-green-300";

  if (a.includes("approve"))
    return "bg-emerald-100 text-emerald-700 border-emerald-300";

  if (a.includes("reject"))
    return "bg-red-100 text-red-700 border-red-300";

  if (a.includes("return"))
    return "bg-purple-100 text-purple-700 border-purple-300";

  return "bg-gray-100 text-gray-700 border-gray-300";
}

export default function FieldSurveyStatus() {

  const [assignments, setAssignments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);

  const [liveSurveyors, setLiveSurveyors] = useState([]);

  const [activeCircle, setActiveCircle] = useState(null);
  const [proximityMap, setProximityMap] = useState({});

  const DISTANCE_THRESHOLD = 25;

  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadingLive, setLoadingLive] = useState(false);
  const [loadingProximity, setLoadingProximity] = useState(null);

  const [refreshCountdown, setRefreshCountdown] = useState(10);
const [surveyorList, setSurveyorList] = useState([]);
const [surveyorDialogOpen, setSurveyorDialogOpen] = useState(false);
const [loadingSurveyors, setLoadingSurveyors] = useState(false);
  /* Fetch assignments */

  useEffect(() => {

    const fetchAssignments = async () => {

      try {

        setLoadingAssignments(true);

        const res = await fetch(
          `${API_BASE_URL}/api/assignments/survey-status`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          }
        );

        const data = await res.json();
        setAssignments(data);

      } catch (err) {
        toast.error("Failed to load assignments");
      } finally {
        setLoadingAssignments(false);
      }

    };

    fetchAssignments();

  }, []);

  /* Fetch live surveyors */

  useEffect(() => {

    const fetchLive = async () => {

      try {

        setLoadingLive(true);

        const res = await fetch(
          `${API_BASE_URL}/api/assignments/live-surveyors`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("token")
            }
          }
        );

        const data = await res.json();
        setLiveSurveyors(data);

      } catch {
        toast.error("Failed to load live surveyors");
      } finally {
        setLoadingLive(false);
        setRefreshCountdown(10);
      }

    };

    fetchLive();

    const refreshInterval = setInterval(fetchLive, 10000);

    const countdownInterval = setInterval(() => {
      setRefreshCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(countdownInterval);
    };

  }, []);

  /* Activity modal */

  async function openActivity(a) {

    try {

      const res = await fetch(
        `${API_BASE_URL}/api/assignments/by-group/${a.assignmentGroupId}/activity`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
          }
        }
      );

      const logs = await res.json();

      setActivityLogs(logs);
      setActivityOpen(true);

    } catch {
      toast.error("Failed to load activity logs");
    }

  }

  /* Proximity */

  async function fetchProximity(user) {

    setLoadingProximity(user._id);

    try {

      const res = await fetch(
        `${API_BASE_URL}/api/assignments/live-surveyors/${user._id}/proximity`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
          }
        }
      );

      const data = await res.json();

      setProximityMap(prev => ({
        ...prev,
        [user._id]: data
      }));

      if (data?.nearestAssignment?.minDistance) {

        setActiveCircle({
          userId: user._id,
          radius: data.nearestAssignment.minDistance
        });

      }

    } catch {
      toast.error("Proximity check failed");
    }

    setLoadingProximity(null);

  }

  /* Icons */

  const liveIcon = L.divIcon({
    className: "",
    html: `<div class="live-dot online"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const offlineIcon = L.divIcon({
    className: "",
    html: `<div class="live-dot offline"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const warningIcon = L.divIcon({
    className: "",
    html: `<div class="live-dot warning blink"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const breakIcon = L.divIcon({
    className: "",
    html: `<div class="live-dot break"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
async function openSurveyors(groupId) {

  try {

    setLoadingSurveyors(true);

    const res = await fetch(
      `${API_BASE_URL}/api/assignments/group/${groupId}/surveyors`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    const data = await res.json();

    setSurveyorList(data);
    setSurveyorDialogOpen(true);

  } catch {
    toast.error("Failed to load surveyors");
  } finally {
    setLoadingSurveyors(false);
  }
}
function getAssignmentStatus(a) {
  if (a.status === "approved") return "approved";
  if (a.status === "completed") return "completed";
  if (a.status === "in_progress") return "in_progress";
  return "pending";
}
  return (
    <div className="h-[calc(100vh-80px)] flex flex-col p-6 gap-6 overflow-hidden">

      {/* HEADER */}

      <div>
        <div className="text-2xl font-semibold">
          Field Survey Status
        </div>
        <div className="text-sm text-muted-foreground">
          Monitor live surveyor activity and assignment progress
        </div>
      </div>

      {/* MAIN LAYOUT */}

      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* MAP PANEL */}

        <div className="w-[40%] bg-card border rounded-2xl shadow-sm p-4 shrink-0">

          <div className="flex justify-between mb-3">

            <div className="font-semibold">
              Live Surveyors Map
            </div>

            <div className="text-xs flex items-center gap-2">
              Refresh in
              <span className="font-semibold">{refreshCountdown}s</span>
            </div>

            {loadingLive && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <Spinner small />
                Updating...
              </div>
            )}

          </div>

          <div className="h-[420px] rounded-xl overflow-hidden border">

            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
            >

              <MapResizer />
              <FitBounds surveyors={liveSurveyors} />

              <TileLayer
                attribution="© OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {liveSurveyors
                .filter(u => u.lastLocation)
                .map(user => {

                  const proximityData = proximityMap[user._id];

                  return (
                    <Marker
                      key={user._id}
                      position={[
                        user.lastLocation.lat,
                        user.lastLocation.lng
                      ]}
                      icon={
                        !user.online
                          ? offlineIcon
                          : user.isOnBreak
                          ? breakIcon
                          : proximityData?.nearestAssignment?.minDistance > DISTANCE_THRESHOLD
                          ? warningIcon
                          : liveIcon
                      }
                      eventHandlers={{
                        click: () => fetchProximity(user),
                        popupclose: () => {
                          if (activeCircle?.userId === user._id)
                            setActiveCircle(null);
                        }
                      }}
                    >

                      {activeCircle?.userId === user._id && (
                        <Circle
                          center={[
                            user.lastLocation.lat,
                            user.lastLocation.lng
                          ]}
                          radius={activeCircle.radius}
                          pathOptions={{
                            color:
                              activeCircle.radius > DISTANCE_THRESHOLD
                                ? "red"
                                : "blue",
                            fillOpacity: 0.15
                          }}
                        />
                      )}

                      <Popup>

                        <div className="text-sm space-y-2">

                          <div className="font-semibold">
                            {user.username}
                          </div>

                          {user.isOnBreak && (
                            <div className="text-xs text-orange-600 font-medium">
                              On Break
                            </div>
                          )}

                          {loadingProximity === user._id ? (
                            <Spinner small />
                          ) : proximityData?.nearestAssignment ? (
                            <>
                              <div className="text-xs border-t pt-2">
                                Assignment:{" "}
                                {proximityData.nearestAssignment.surveyName}
                              </div>

                              <div className="text-xs">
                                Distance:{" "}
                                {proximityData.nearestAssignment.minDistance} m
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Click marker to check proximity
                            </div>
                          )}

                        </div>

                      </Popup>

                    </Marker>
                  );

                })}

            </MapContainer>

          </div>

        </div>

        {/* ASSIGNMENT TABLE */}

        <div className="flex-1 bg-card border rounded-2xl shadow-sm flex flex-col overflow-hidden">

          <div className="p-4 border-b shrink-0">
            <div className="font-semibold">
              Assignments Overview
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">

            {loadingAssignments ? (
              <div className="py-12">
                <Spinner />
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">

                <thead className="sticky top-0 bg-background z-10 border-b">
                  <tr>
                    <th className="py-3 px-3 text-left">Survey Name</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Assigned On</th>
                    <th>Approved By</th>
                    <th>Approved At</th>
                  </tr>
                </thead>

                <tbody>

                  {assignments.map(a => (

                    <tr
                      key={a.assignmentGroupId}
                      className="border-b odd:bg-muted/20 hover:bg-muted/40 cursor-pointer"
                      onClick={() => openActivity(a)}
                    >

                      <td className="py-3 px-3 font-medium">
                        {a.surveyName || a.surveyId}
                      </td>

                      <td>
                        <span
                          className={`px-2 py-1 rounded text-xs capitalize ${a.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : a.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : a.status === "in_progress"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {getAssignmentStatus(a)}
                        </span>
                      </td>
                      <td>
                        <button
                          className="text-primary underline text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSurveyors(a.assignmentGroupId);
                          }}
                        >
                          View Surveyors
                        </button>
                      </td>
                      <td>{new Date(a.createdAt).toLocaleDateString()}</td>

                      <td>{a.approvedBy?.username || "-"}</td>

                      <td>
                        {a.approvedAt
                          ? new Date(a.approvedAt).toLocaleString()
                          : "-"}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>
            )}

          </div>

        </div>

      </div>

      {/* ACTIVITY MODAL */}

      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>

        <DialogContent className="max-h-[70vh] overflow-y-auto">

          <DialogHeader>
            <DialogTitle>Assignment Activity</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            {Array.isArray(activityLogs) ? (
              activityLogs.map(log => (
                <div
                  key={log._id}
                  className={`border rounded-lg p-3 text-sm ${getActivityColor(log.action)}`}
                >
                  <div className="font-semibold">
                    {log.action.replace("_", " ")}
                  </div>

                  <div className="text-xs opacity-70">
                    {log.userId?.username || "System"}
                  </div>

                  <div className="text-xs opacity-70">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                No activity logs
              </div>
            )}
          </div>

        </DialogContent>

      </Dialog>
      <Dialog open={surveyorDialogOpen} onOpenChange={setSurveyorDialogOpen}>
        <DialogContent className="max-h-[60vh] overflow-y-auto">

          <DialogHeader>
            <DialogTitle>Surveyors for this Survey</DialogTitle>
          </DialogHeader>

          {loadingSurveyors ? (
            <Spinner />
          ) : (
            <div className="space-y-2">

              {surveyorList.map((u, i) => (
  <div
    key={i}
    className="border rounded-lg p-3 flex justify-between items-center"
  >
    <div className="font-medium">
      {u.username}
    </div>

    <span
      className={`px-2 py-1 rounded text-xs ${
        u.status === "completed"
          ? "bg-green-100 text-green-700"
          : u.status === "in_progress"
          ? "bg-orange-100 text-orange-700"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {u.status}
    </span>
  </div>
))}
              {!surveyorList.length && (
                <div className="text-sm text-muted-foreground">
                  No surveyors found
                </div>
              )}

            </div>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
}