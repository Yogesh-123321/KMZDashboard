import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ApprovalPage() {
  const [assignments, setAssignments] = useState([]);

  async function loadAssignments() {
    const res = await fetch(`${API_BASE_URL}/api/assignments/approval-queue`, {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    const data = await res.json();
    setAssignments(data);
  }

  async function approveAssignment(id) {
    await fetch(`${API_BASE_URL}/api/assignments/${id}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    });

    loadAssignments();
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="text-2xl font-semibold">Approval Queue</div>

      <div className="bg-card border rounded-xl p-4">
        <table className="w-full text-sm">
          <thead className="border-b">
            <tr className="text-left">
              <th className="py-2">Survey</th>
              <th>Surveyor</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {assignments.map(a => (
              <tr key={a._id} className="border-b">
                <td className="py-2">
                  {a.surveyName || a.surveyId}
                </td>

                <td>
                  {a.assignedTo?.username || "Unknown"}
                </td>

                <td>
                  <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-600">
                    {a.status}
                  </span>
                </td>

                <td>
                  <button
                    onClick={() => approveAssignment(a._id)}
                    className="border px-3 py-1 rounded hover:bg-muted"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {assignments.length === 0 && (
          <div className="text-center text-muted-foreground py-6">
            No completed assignments awaiting approval
          </div>
        )}
      </div>
    </div>
  );
}
