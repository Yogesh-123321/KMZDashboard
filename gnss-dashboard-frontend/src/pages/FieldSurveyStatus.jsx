import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function FieldSurveyStatus() {
  const [assignments, setAssignments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityOpen, setActivityOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/assignments/all`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    })
      .then(res => res.json())
      .then(data => setAssignments(data));
  }, []);

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

  return (
    <div className="p-6 space-y-6 h-full flex flex-col">
      <div className="text-2xl font-semibold">
        Field Survey Status
      </div>

      {/* SCROLLABLE TABLE CARD */}
      <div className="bg-card border rounded-xl p-4">
        <div className="max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm border-collapse">

            {/* HEADER */}
            <thead className="border-b sticky top-0 bg-background z-20 shadow-sm">
              <tr className="text-left">
                <th className="py-2">Survey Name</th>
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
                  className="border-b odd:bg-muted even:bg-card cursor-pointer hover:bg-muted/40"
                  onClick={() => openActivity(a)}
                >
                  <td className="py-2">
                    {a.surveyName || a.surveyId}
                  </td>

                  <td>
                    {a.status === "pending" && (
                      <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-600">
                        pending
                      </span>
                    )}

                    {a.status === "in_progress" && (
                      <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-600">
                        in progress
                      </span>
                    )}

                    {a.status === "completed" && (
                      <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-600">
                        completed
                      </span>
                    )}

                    {a.status === "approved" && (
                      <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-600">
                        approved
                      </span>
                    )}
                  </td>

                  {/* ASSIGNED TO */}
                  <td>
                    {a.assignedTo?.username || "-"}
                  </td>

                  <td>
                    {new Date(a.createdAt).toLocaleDateString()}
                  </td>

                  <td>
                    {a.approvedBy?.username || "-"}
                  </td>

                  <td>
                    {a.approvedAt
                      ? new Date(a.approvedAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {assignments.length === 0 && (
          <div className="text-muted-foreground text-sm py-6 text-center">
            No assignments found
          </div>
        )}
      </div>

      {/* ACTIVITY MODAL */}
      {activityOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl w-[520px] max-h-[70vh] overflow-y-auto p-6 space-y-4">

            <div className="text-lg font-semibold">
              Assignment Activity
            </div>

            {activityLogs.length === 0 && (
              <div className="text-muted-foreground text-sm">
                No activity recorded
              </div>
            )}

            {activityLogs.map(log => (
              <div
                key={log._id}
                className="border rounded-lg p-3 text-sm"
              >
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
