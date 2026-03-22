import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function InventoryManagement() {

  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  /* ---------- LOAD DEVICES ---------- */

  async function loadDevices() {

    try {

      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/devices`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token"),
        },
      });

      const data = await res.json();

      console.log("DEVICES API RESPONSE:", data);

      // ensure array always
      if (Array.isArray(data)) {
        setDevices(data);
      } else if (Array.isArray(data.devices)) {
        setDevices(data.devices);
      } else {
        setDevices([]);
      }

    } catch (err) {

      console.error("DEVICE FETCH ERROR:", err);
      setDevices([]);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {
    loadDevices();
  }, []);

  /* ---------- HISTORY ---------- */

  async function openHistory(device) {

    try {

      const res = await fetch(
        `${API_BASE_URL}/api/devices/${device.deviceId}/history`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        }
      );

      const data = await res.json();

      console.log("DEVICE HISTORY:", data);

      setDeviceHistory(Array.isArray(data) ? data : []);
      setSelectedDevice(device);
      setHistoryOpen(true);

    } catch (err) {

      console.error("HISTORY ERROR:", err);

    }

  }

  /* ---------- UI ---------- */

  return (

    <div className="p-6 space-y-6">

      <div className="text-2xl font-semibold">
        Device Inventory
      </div>

      <div className="text-xs text-muted-foreground">
        Devices loaded: {devices?.length || 0}
      </div>

      <div className="bg-card border rounded-xl p-4">

        {loading ? (

          <div className="py-6 text-center">
            Loading devices...
          </div>

        ) : (

          <table className="w-full text-sm">

              <thead className="border-b">
                <tr className="text-left">
                  <th className="py-2">Device ID</th>
                  <th>Status</th>
                  <th>Current User</th>
                  <th>Connected At</th>
                </tr>
              </thead>

            <tbody>

              {(!devices || devices.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center py-6 text-muted-foreground">
                    No devices connected yet
                  </td>
                </tr>
              )}

              {devices && devices.map((d) => (

                <tr
                  key={d._id || d.deviceId}
                  onClick={() => openHistory(d)}
                  className="border-b hover:bg-muted/40 cursor-pointer"
                >

                  <td className="py-2 font-medium">
                    {d.deviceId}
                  </td>

                  <td>
                    <span
                      className={`px-2 py-1 rounded text-xs ${d.status === "in_use"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                        }`}
                    >
                      {d.status}
                    </span>
                  </td>

                  <td>
                    {d.currentUser?.username || "Unassigned"}
                  </td>

                  <td>
                    {d.connectedAt
                      ? new Date(d.connectedAt).toLocaleString()
                      : "-"}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        )}

      </div>

      {/* ---------- DEVICE HISTORY MODAL ---------- */}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>

<DialogContent className="max-w-3xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Device History {selectedDevice?.deviceId}
            </DialogTitle>
          </DialogHeader>

<table className="w-full text-sm table-fixed">
            <thead className="border-b">
<tr>
  <th className="text-left py-2 w-[20%]">User</th>
  <th className="w-[30%]">Start</th>
  <th className="w-[30%]">End</th>
  <th className="w-[20%]">Duration</th>
</tr>
</thead>

            <tbody>

              {(!deviceHistory || deviceHistory.length === 0) && (
                <tr>
                  <td colSpan="4" className="text-center py-4 text-muted-foreground">
                    No history found
                  </td>
                </tr>
              )}

              {deviceHistory && deviceHistory.map((log) => (

                <tr key={log._id} className="border-b">

                  <td className="py-3">
                    {log.userId?.username || "-"}
                  </td>

                  <td>
                    {log.startTime
                      ? new Date(log.startTime).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    {log.endTime
                      ? new Date(log.endTime).toLocaleString()
                      : "Active"}
                  </td>

                 <td>
        {log.endTime
          ? log.durationMinutes >= 1
            ? `${log.durationMinutes} min`
            : "< 1 min"
          : "-"}
      </td>

                </tr>

              ))}

            </tbody>

          </table>

        </DialogContent>

      </Dialog>

    </div>

  );

}