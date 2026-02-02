const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchKmzFiles() {
  const res = await fetch(`${API_BASE_URL}/api/files`);
  if (!res.ok) throw new Error("Failed to fetch KMZ files");
  return res.json();
}

export async function fetchParsedKmz(fileId) {
  const res = await fetch(`${API_BASE_URL}/api/kmz/${fileId}/parsed`);
  if (!res.ok) throw new Error("Failed to load parsed KMZ");
  return res.json();
}

export async function parseKmz(fileId, fileName) {
  const res = await fetch(`${API_BASE_URL}/api/kmz/${fileId}/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName })
  });
  if (!res.ok) throw new Error("Failed to parse KMZ");
}
