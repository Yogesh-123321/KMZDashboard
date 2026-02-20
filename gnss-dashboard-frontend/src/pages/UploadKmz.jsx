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
                  className="border rounded p-2 text-sm"
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
