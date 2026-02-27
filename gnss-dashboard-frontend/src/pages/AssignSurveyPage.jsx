import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AssignSurveyPage({ selectedFile }) {
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  /* ───────── Load Users ───────── */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(r => r.json())
      .then(data => {
        setUsers(data.filter(u => u.role !== "ADMIN"));
      })
      .catch(err => {
        console.error("Failed to load users:", err);
      });
  }, []);

  /* ───────── Load Existing Assignments ───────── */
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/assignments/all`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(r => r.json())
      .then(data => {
        setAssignments(data);
      })
      .catch(err => {
        console.error("Failed to load assignments:", err);
      });
  }, []);

  /* ───────── Load KMZ Preview ───────── */
  useEffect(() => {
    if (!selectedFile) return;

    const surveyId =
      selectedFile.driveFileId || selectedFile.id;

    setLoadingPreview(true);
    setPreviewData(null);

    fetch(
      `${API_BASE_URL}/api/kmz/${surveyId}/preview`,
      {
        headers: {
          Authorization:
            "Bearer " + localStorage.getItem("token")
        }
      }
    )
      .then(r => r.json())
      .then(data => {
        setPreviewData(data);
      })
      .catch(err => {
        console.error("Preview load failed:", err);
      })
      .finally(() => {
        setLoadingPreview(false);
      });

  }, [selectedFile]);

  /* ───────── Assign Survey ───────── */
  async function assignSurvey(userId) {
    if (!selectedFile) {
      alert("Select a KMZ file first");
      return;
    }

    if (!previewData) {
      alert("Wait for map preview to load");
      return;
    }

    const surveyId =
      selectedFile.driveFileId || selectedFile.id;

    const res = await fetch(
      `${API_BASE_URL}/api/assignments/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
          surveyId,
          surveyName: selectedFile.name,
          userId
        })
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error("Assignment error:", error);
      alert(error.error || "Assignment failed");
      return;
    }

    alert("Survey assigned successfully");

    // 🔥 Refresh assignments list
    const refreshed = await fetch(
      `${API_BASE_URL}/api/assignments/all`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    setAssignments(await refreshed.json());
  }

  const allTracks = previewData?.tracks || [];

  /* ───────── Compute Assigned Users For This Survey ───────── */

  const surveyId =
    selectedFile?.driveFileId || selectedFile?.id;

  const assignedUserIds = assignments
    .filter(a =>
      a.surveyId === surveyId &&
      a.status !== "approved"
    )
    .map(a =>
      typeof a.assignedTo === "object"
        ? a.assignedTo._id
        : a.assignedTo
    );

  return (
    <div className="h-full overflow-y-auto border rounded-lg p-4 space-y-4">

      {/* Title */}
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
          </div>

          {/* ───────── MAP PREVIEW ───────── */}
          {loadingPreview && (
            <div className="text-sm">
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

                {allTracks.map((track, index) => (
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
                ))}
              </MapContainer>
            </div>
          )}
        </>
      )}

      {/* ───────── USER LIST ───────── */}
      <div className="border rounded-lg p-4 space-y-2">
        {users.map(user => {
          const isAssigned =
            assignedUserIds.includes(user._id);

          return (
            <div
              key={user._id}
              className="flex justify-between items-center border rounded px-3 py-2"
            >
              <div>
                <div className="font-medium">
                  {user.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user.role}
                </div>
              </div>

              <button
                className="px-3 py-1 border rounded hover:bg-muted disabled:opacity-50"
                disabled={
                  !previewData || isAssigned
                }
                onClick={() => assignSurvey(user._id)}
              >
                {isAssigned
                  ? "Already Assigned"
                  : "Assign"}
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}