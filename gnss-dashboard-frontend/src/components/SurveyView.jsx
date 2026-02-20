import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup } from "react-leaflet";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { fetchParsedKmz, completeAssignment } from "@/lib/api";

export default function SurveyView({ assignment, onBack }) {

  const [kmzData, setKmzData] = useState(null);
  const [recordedTrack, setRecordedTrack] = useState([]);

  useEffect(() => {
    if (!assignment) return;

    async function loadKmz() {
      const data = await fetchParsedKmz(assignment.surveyId);
      setKmzData(data);
    }

    loadKmz();
  }, [assignment]);

 const track = useMemo(() => {
  return (
    kmzData?.tracks?.[0]?.coordinates?.map(c => [c.lat, c.lon]) || []
  );
}, [kmzData]);

  const points = kmzData?.points || [];
console.log("TRACK DEBUG:", track.length, track[0], track[1]);
 useEffect(() => {
  if (!track.length) return;

  setRecordedTrack([]); // reset

  let i = 0;

  const interval = setInterval(() => {
    i++;

    setRecordedTrack(track.slice(0, i));

    if (i >= track.length) clearInterval(interval);
  }, 120);

  return () => clearInterval(interval);
}, [track]);

async function handleCompleteAssignment() {
  if (!assignment?._id) return;

  const confirmComplete = window.confirm(
    "Mark this assignment as completed?"
  );

  if (!confirmComplete) return;

  try {
    await completeAssignment(assignment._id);
    alert("Assignment marked as completed");
    onBack();
  } catch (err) {
    console.error(err);
    alert("Failed to update assignment status");
  }
}

  return (
    <div className="space-y-4">

      <div className="flex justify-between">
  <Button variant="outline" onClick={onBack}>
    Back to Dashboard
  </Button>

  {assignment.status !== "completed" && (
    <Button
      className="bg-green-600 hover:bg-green-700"
      onClick={handleCompleteAssignment}
    >
      Complete Assignment
    </Button>
  )}
</div>

      <div className="h-[400px] rounded-xl overflow-hidden border">
        {track.length > 0 && (
          <MapContainer
            center={track[0]}
            zoom={17}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Polyline positions={track} />

<Polyline positions={recordedTrack} color="red" weight={5} />

            {points.map((p, i) => (
              <Marker key={i} position={[p.lat, p.lon]}>
                <Popup>{p.name}</Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

    </div>
  );
}
