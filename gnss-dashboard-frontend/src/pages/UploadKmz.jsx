import { useState } from "react";
import KmzList from "@/components/KmzList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function UploadKmz() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [selectedFile, setSelectedFile] = useState(null);

  /* HISTORY */
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);

  async function handleUpload() {
    if (!file) return;

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");

      setFile(null);
      setRefreshKey(prev => prev + 1);

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /* LOAD HISTORY */
  async function openHistory() {
  if (!selectedFile) return;

  const res = await fetch(
    `${API_BASE_URL}/api/kmz/${selectedFile.id}/activity`,
    {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token")
      }
    }
  );

  const logs = await res.json();
  setHistoryLogs(logs);
  setHistoryOpen(true);
}
function getLogStyle(action) {
  switch (action) {
    case "KMZ_UPLOADED":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700";

    case "KMZ_PARSED":
      return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700";

    case "TRACK_EDITED":
      return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700";

    case "PHOTO_MOVED":
      return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-700";

    case "KMZ_SAVED_COPY":
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700";

    case "KMZ_DELETED":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700";

    default:
      return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600";
  }
}
  return (
    <div className="h-full flex flex-col gap-4">

      {/* Upload Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div className="flex items-center gap-4">
            <CardTitle>Upload survey</CardTitle>

            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>

          {/* HISTORY BUTTON */}
          {selectedFile && (
            <Button
              variant="outline"
              onClick={openHistory}
            >
              History
            </Button>
          )}
        </CardHeader>

        <CardContent className="pt-4">
          <Input
            type="file"
            accept=".kmz"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </CardContent>
      </Card>

      {/* KMZ WORKSPACE */}
      <div className="flex-1 min-h-0">
        <KmzList
          reloadTrigger={refreshKey}
          onFileSelected={setSelectedFile}
        />
      </div>

      {/* HISTORY POPUP */}
      {historyOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border rounded-xl w-[520px] p-6 space-y-4">
            <div className="text-lg font-semibold">
              KMZ Activity Log
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {historyLogs.map(log => (
                <div
                  key={log._id}
className={`border rounded p-2 text-sm ${getLogStyle(log.action)}`}
                >
                  <div className="font-medium">{log.action}</div>
                  <div className="text-xs text-muted-foreground">
                    {log.userId?.username || "System"} •{" "}
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setHistoryOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
