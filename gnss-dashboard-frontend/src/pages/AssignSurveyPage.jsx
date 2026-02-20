import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AssignSurveyPage({ selectedFile }) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(r => r.json())
      .then(data => {
        // hide ADMIN from list
        setUsers(data.filter(u => u.role !== "ADMIN"));
      });
  }, []);

  async function assignSurvey(userId) {
    if (!selectedFile) {
      alert("Select a KMZ file first from Explorer");
      return;
    }

    const res = await fetch(`${API_BASE_URL}/api/assignments/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token")
      },
     body: JSON.stringify({
  surveyId: selectedFile.id,
  surveyName: selectedFile.name,   // NEW
  userId
})
    });

    if (!res.ok) {
      alert("Assignment failed");
      return;
    }

    alert("Survey assigned successfully");
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">
        Assign Survey
      </div>

      {!selectedFile && (
        <div className="text-sm text-muted-foreground">
          Select a KMZ file from Explorer first
        </div>
      )}

      {selectedFile && (
        <div className="text-sm border rounded p-2 bg-muted/30">
          Selected Survey: <b>{selectedFile.name}</b>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-2">
        {users.map(user => (
          <div
            key={user._id}
            className="flex justify-between items-center border rounded px-3 py-2"
          >
            <div>
              <div className="font-medium">{user.username}</div>
              <div className="text-xs text-muted-foreground">
                {user.role}
              </div>
            </div>

            <button
              className="px-3 py-1 border rounded hover:bg-muted"
              onClick={() => assignSurvey(user._id)}
            >
              Assign
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
