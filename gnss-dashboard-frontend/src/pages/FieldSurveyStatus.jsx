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

  useEffect(() => {
    const points = surveyors
      .filter(s => s.lastLocation)
      .map(s => [s.lastLocation.lat, s.lastLocation.lng]);

    if (points.length > 0) {
      map.fitBounds(points, { padding: [50, 50] });
    }
  }, [surveyors, map]);

  return null;
}

export default function FieldSurveyStatus() {
  const [assignments, setAssignments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);
  const [liveSurveyors, setLiveSurveyors] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [proximityMap, setProximityMap] = useState({});
  const DISTANCE_THRESHOLD = 25;

  /* Fetch assignments */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/assignments/all`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(res => res.json())
      .then(setAssignments);
  }, []);

  /* Fetch live surveyors */
  useEffect(() => {
    const fetchLive = async () => {
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
    };

    fetchLive();
    const interval = setInterval(fetchLive, 10000);
    return () => clearInterval(interval);
  }, []);

  /* Activity modal */
  async function openActivity(a) {
    const res = await fetch(
      `${API_BASE_URL}/api/assignments/${a._id}/activity`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );
    const logs = await res.json();
    setActivityLogs(logs);
    setActivityOpen(true);
  }

  /* Proximity */
  async function fetchProximity(user) {
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
        lat: user.lastLocation.lat,
        lng: user.lastLocation.lng,
        radius: data.nearestAssignment.minDistance
      });
    }
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

      {/* MAIN FLEX LAYOUT */}
      <div className="flex flex-1 gap-6 overflow-hidden">

        {/* MAP PANEL */}
        <div className="w-[40%] bg-card border rounded-2xl shadow-sm p-4 shrink-0">
          <div className="flex justify-between mb-3">
            <div className="font-semibold">
              Live Surveyors Map
            </div>
            <div className="text-xs text-muted-foreground">
              Auto refresh: 10s
            </div>
          </div>

          <div className="h-[420px] rounded-xl overflow-hidden border">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={5}
              style={{ height: "100%", width: "100%" }}
            >
              <MapResizer />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds surveyors={liveSurveyors} />

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
                        user.online
                          ? proximityData?.nearestAssignment?.minDistance > DISTANCE_THRESHOLD
                            ? warningIcon
                            : liveIcon
                          : offlineIcon
                      }
                      eventHandlers={{
                        click: () => fetchProximity(user)
                      }}
                    >
                      {activeCircle?.userId === user._id && (
                        <Circle
                          center={[activeCircle.lat, activeCircle.lng]}
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

                          {proximityData?.nearestAssignment && (
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
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>

        {/* ASSIGNMENTS PANEL (SCROLLABLE) */}
        <div className="flex-1 bg-card border rounded-2xl shadow-sm flex flex-col overflow-hidden">

          <div className="p-4 border-b shrink-0">
            <div className="font-semibold">
              Assignments Overview
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
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
                    key={a._id}
                    className="border-b odd:bg-muted/20 hover:bg-muted/40 cursor-pointer"
                    onClick={() => openActivity(a)}
                  >
                    <td className="py-3 px-3 font-medium">
                      {a.surveyName || a.surveyId}
                    </td>
                    <td>{a.status}</td>
                    <td>{a.assignedTo?.username || "-"}</td>
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

            {assignments.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No assignments available
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ACTIVITY MODAL */}
      {activityOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl w-[520px] max-h-[70vh] overflow-y-auto p-6 space-y-4">
            <div className="text-lg font-semibold">
              Assignment Activity
            </div>

            {activityLogs.map(log => (
              <div key={log._id} className="border p-3 rounded-lg text-sm">
                <div className="font-medium">
                  {log.action.replace("_", " ")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {log.userId?.username || "System"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <button
                onClick={() => setActivityOpen(false)}
                className="border px-3 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}