const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* ───────── AUTH HEADER ───────── */
function authHeader() {
  return {
    Authorization: "Bearer " + localStorage.getItem("token")
  };
}

/* ───────── EXPLORER ───────── */
export async function fetchExplorerTree() {
  const res = await fetch(`${API_BASE_URL}/api/explorer`, {
    headers: authHeader()
  });
  if (!res.ok) throw new Error("Failed to load explorer tree");
  return res.json();
}

export async function saveExplorerTree(data) {
  const res = await fetch(`${API_BASE_URL}/api/explorer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    },
    body: JSON.stringify(data)
  });

  if (!res.ok) throw new Error("Failed to save explorer tree");
}

/* ───────── KMZ FILE LIST ───────── */
export async function fetchKmzFiles() {
  const res = await fetch(`${API_BASE_URL}/api/files`, {
    headers: authHeader()
  });
  if (!res.ok) throw new Error("Failed to fetch KMZ files");
  return res.json();
}

/* ───────── PARSED KMZ ───────── */
export async function fetchParsedKmz(fileId) {
  const res = await fetch(`${API_BASE_URL}/api/kmz/${fileId}/parsed`, {
    headers: authHeader()
  });

  if (!res.ok) throw new Error("Failed to load parsed KMZ");
  return res.json();
}

/* ───────── PARSE KMZ ───────── */
export async function parseKmz(fileId, fileName) {
  const res = await fetch(`${API_BASE_URL}/api/kmz/${fileId}/parse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    },
    body: JSON.stringify({ fileName })
  });

  if (!res.ok) throw new Error("Failed to parse KMZ");
  return res.json();
}

/* ───────── LOGIN ───────── */
export async function login(username, password) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!res.ok) throw new Error("Login failed");

  return res.json();
}

/* ───────── ASSIGNMENTS ───────── */
export async function fetchMyAssignments() {
  const res = await fetch(`${API_BASE_URL}/api/assignments/my`, {
    headers: authHeader()
  });

  if (!res.ok) throw new Error("Failed to fetch assignments");

  return res.json();
}
export async function completeAssignment(id) {
  const res = await fetch(`${API_BASE_URL}/api/assignments/${id}/complete`, {
    method: "PATCH",
    headers: {
      Authorization: "Bearer " + localStorage.getItem("token")
    }
  });

  if (!res.ok) throw new Error("Failed to complete assignment");

  return res.json();
}
