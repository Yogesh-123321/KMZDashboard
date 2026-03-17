import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ROLES = [
  "ROLE_1",
  "ROLE_2",
  "ROLE_3",
  "ROLE_4",
  "ROLE_5",
  "ROLE_6",
  "ROLE_7",
  "ADMIN"
];

export default function ManageSurveyors() {
  const [users, setUsers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState({});
const [reliabilityMap, setReliabilityMap] = useState({});
  /* NEW STATE */
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
const [sortBy, setSortBy] = useState("alphabetical");
const totalUsers = users.length;
const activeUsers = users.filter(u => u.isActive).length;

const [search, setSearch] = useState("");

const filteredUsers = users.filter(user =>
  user.username.toLowerCase().includes(search.toLowerCase())
);

const sortedUsers = [...filteredUsers].sort((a, b) => {

  /* ACTIVE FIRST SORT */

  if (sortBy === "active") {

    if (a.isActive !== b.isActive) {
      return b.isActive - a.isActive;   // active users first
    }

    return a.username.localeCompare(b.username); // alphabetical inside groups
  }

  /* NEWEST FIRST */

  if (sortBy === "newest") {

    const dateDiff =
      new Date(b.createdAt) - new Date(a.createdAt);

    if (dateDiff !== 0) return dateDiff;

    return a.username.localeCompare(b.username);
  }

  /* OLDEST FIRST */

  if (sortBy === "oldest") {

    const dateDiff =
      new Date(a.createdAt) - new Date(b.createdAt);

    if (dateDiff !== 0) return dateDiff;

    return a.username.localeCompare(b.username);
  }

  /* DEFAULT: ALPHABETICAL */

  return a.username.localeCompare(b.username);
});

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "ROLE_1"
  });

  const authHeader = {
    Authorization: "Bearer " + localStorage.getItem("token"),
    "Content-Type": "application/json"
  };

  /* ---------------- FETCH USERS ---------------- */

  async function loadUsers() {
    const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: authHeader
    });
    const data = await res.json();
    setUsers(data);
    const map = {};

for (const user of data) {
  const score = await fetchReliability(user._id);
  map[user._id] = score;
}

setReliabilityMap(map);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  /* ---------------- CREATE ---------------- */

const usernameExists = users.some(
  u => u.username.toLowerCase() === form.username.toLowerCase()
);

function generateSuggestions(username) {

  const base = username.toLowerCase();

  return [
    `${base}1`,
    `${base}123`,
    `${base}_${Math.floor(Math.random()*100)}`,
    `${base}${new Date().getFullYear()}`,
    `${base}.${Math.floor(Math.random()*1000)}`
  ];
}


  async function createUser() {

if (!form.username || !form.password) return;

if (usernameExists) {
  alert("Username already exists. Please choose another.");
  return;
}

    await fetch(`${API_BASE_URL}/api/admin/users/create`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify(form)
    });

    setForm({ username: "", password: "", role: "ROLE_1" });
    loadUsers();
  }

  /* ---------------- DELETE ---------------- */

  async function deleteUser(id) {
    await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
      method: "DELETE",
      headers: authHeader
    });

    loadUsers();
  }

  /* ---------------- EDIT ---------------- */

  function startEdit(user) {
    setEditingId(user._id);
  }

  async function saveEdit(user) {
    await fetch(`${API_BASE_URL}/api/admin/users/${user._id}`, {
      method: "PUT",
      headers: authHeader,
      body: JSON.stringify({
  username: user.username,
  role: user.role,
  password: user.newPassword || undefined
})
    });

    setEditingId(null);
    loadUsers();
  }

  /* ---------------- PROFILE MODAL ---------------- */
async function openProfile(user) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/admin/users/${user._id}/profile`,
      { headers: authHeader }
    );

    const profile = await res.json();

    setSelectedUser(profile);
    setProfileOpen(true);
  } catch (err) {
    console.error("Profile fetch failed", err);
  }
}

async function fetchReliability(userId) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/surveyors/${userId}/reliability`,
      { headers: authHeader }
    );

    return await res.json();
  } catch (err) {
    console.error("Reliability fetch failed", err);
    return null;
  }
}
function getScoreColor(score) {
  if (score >= 85) return "text-green-500";
  if (score >= 70) return "text-blue-500";
  if (score >= 50) return "text-orange-500";
  return "text-red-500";
}
  /* ---------------- UI ---------------- */

return (
  <div className="h-full flex flex-col p-6 space-y-6">

    <div className="flex items-center justify-between">

      <div className="text-xl font-semibold">
        Manage Surveyors
      </div>

     
<div className="flex items-center gap-3 text-sm">

  <Input
    placeholder="Search user..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-[180px]"
  />

  <div className="px-3 py-1 rounded-lg border bg-muted">
    Total: <span className="font-semibold">{totalUsers}</span>
  </div>

  <div className="px-3 py-1 rounded-lg border bg-green-500/10 border-green-500/30">
    Active: <span className="font-semibold text-green-500">{activeUsers}</span>
  </div>

  <select
    className="border rounded-lg px-3 py-1 bg-background text-sm"
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
  >
    <option value="alphabetical">A → Z</option>
    <option value="active">Active First</option>
    <option value="newest">Newest First</option>
    <option value="oldest">Oldest First</option>
  </select>

</div>



    </div>

      {/* ADD USER */}
      
{/* ADD USER */}
<div className="border rounded-xl p-5 bg-card shadow-sm space-y-3">

  <div className="text-sm font-semibold text-muted-foreground">
    Create New Surveyor
  </div>

  <div className="flex gap-3">

    {/* USERNAME INPUT + SUGGESTIONS */}
    <div className="flex flex-col gap-1">

      <Input
        placeholder="Username"
        value={form.username}
        onChange={e => setForm({ ...form, username: e.target.value })}
      />

      {usernameExists && form.username && (
        <div className="text-xs text-red-500">
          Username already exists
        </div>
      )}

      {usernameExists && form.username && (
        <div className="flex gap-2 overflow-x-auto pt-1">

          {generateSuggestions(form.username).map(name => (
            <button
              key={name}
              type="button"
              onClick={() => setForm({ ...form, username: name })}
              className="px-3 py-1 text-xs rounded-full border bg-muted hover:bg-primary/10 hover:border-primary transition"
            >
              {name}
            </button>
          ))}

        </div>
      )}

    </div>

    <Input
      type="password"
      placeholder="Password"
      value={form.password}
      onChange={e => setForm({ ...form, password: e.target.value })}
    />

    <select
      className="border rounded px-2"
      value={form.role}
      onChange={e => setForm({ ...form, role: e.target.value })}
    >
      {ROLES.map(r => (
        <option key={r}>{r}</option>
      ))}
    </select>

    <Button onClick={createUser}>
      Add User
    </Button>

  </div>

</div>

      {/* USERS TABLE */}
      {/* USERS GRID */}
<div className="flex-1 overflow-y-auto pr-2">
   <div className="grid grid-cols-4 gap-4">
  {sortedUsers.map(user => {

    const isEditing = editingId === user._id;
const reliability = reliabilityMap[user._id]?.reliabilityScore;
    return (
    
      <div
        key={user._id}
        onClick={() => {
          if (editingId !== user._id) openProfile(user);
        }}
        className={`relative border-2 rounded-xl p-4 shadow-md transition-all duration-200 space-y-3 bg-card cursor-pointer
  ${user.isActive
            ? "border-green-500 shadow-green-500/20 shadow-lg ring-1 ring-green-500/40"
            : "border-border/70 hover:border-primary/40 hover:shadow-xl"
          }`}
      >

        {/* USERNAME */}
        <div className="space-y-2 text-center">

  {isEditing ? (
    <>
      <Input
        value={user.username}
        onClick={(e)=>e.stopPropagation()}
        onChange={e =>
          setUsers(prev =>
            prev.map(u =>
              u._id === user._id
                ? { ...u, username: e.target.value }
                : u
            )
          )
        }
      />

      <Input
        type="password"
        placeholder="New Password"
        onClick={(e)=>e.stopPropagation()}
        onChange={e =>
          setUsers(prev =>
            prev.map(u =>
              u._id === user._id
                ? { ...u, newPassword: e.target.value }
                : u
            )
          )
        }
      />
    </>
  ) : (
   
             <div className="flex flex-col items-center gap-1">

  {/* USERNAME ROW */}
  <div className="flex items-center gap-2 font-semibold text-sm">
    <span
      className={`w-2.5 h-2.5 rounded-full ${
        user.isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
      }`}
    />
    {user.username}
  </div>

  {/* RELIABILITY BELOW */}
  <div className={`text-xs font-semibold ${getScoreColor(reliability)}`}>
    Reliability: {reliability ?? "--"}
  </div>

</div>

  )}

</div>
{/* PASSWORD */}
<div
  className="flex items-center justify-center gap-2 text-xs"
  onClick={(e) => e.stopPropagation()}
>

  {showPassword[user._id]
    ? user.passwordPlain || "••••••••"
    : "••••••••"}

  <button
    onClick={(e) => {
      e.stopPropagation();
      setShowPassword(prev => ({
        ...prev,
        [user._id]: !prev[user._id]
      }));
    }}
  >
    {showPassword[user._id] ? (
      <Eye size={14} />
    ) : (
      <Eye size={14} />
    )}
  </button>

</div>
        {/* ROLE */}
        <div className="text-xs text-muted-foreground text-center">
          {isEditing ? (
            <select
              className="border rounded px-2 py-1 w-full"
              value={user.role}
              onChange={e =>
                setUsers(prev =>
                  prev.map(u =>
                    u._id === user._id
                      ? { ...u, role: e.target.value }
                      : u
                  )
                )
              }
            >
              {ROLES.map(r => (
                <option key={r}>{r}</option>
              ))}
            </select>
          ) : (
            user.role
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-center gap-2">

          {isEditing ? (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (!confirm("Save changes to this user?")) return;
                saveEdit(user);
              }}
            >
              Save
            </Button>
          ) : (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!confirm("Edit this user?")) return;
                  startEdit(user);
                }}
              >
                Edit
              </Button>
          )}

          <Button
            size="sm"
            className="bg-red-400 hover:bg-red-500 text-white"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm("Delete this user permanently?")) return;
              deleteUser(user._id);
            }}
          >
            Delete
          </Button>

        </div>

      </div>
    );
  })}
  </div>
</div>

      {/* PROFILE MODAL */}
     {profileOpen && selectedUser && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
<div className="bg-card text-card-foreground border rounded-2xl shadow-2xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <div>
          <div className="text-lg font-semibold">
            {selectedUser.username}
          </div>
          <div className="text-xs text-muted-foreground">
            Surveyor Profile
          </div>
        </div>

        <span className="text-xs px-2 py-1 border rounded bg-muted">
          {selectedUser.role}
        </span>
      </div>

      {/* CONTENT */}
<div className="p-6 space-y-6 overflow-y-auto">
  {/* ATTENDANCE SECTION */}
<div className="grid grid-cols-3 gap-4">

  <div className="border rounded-xl p-4 bg-green-500/10 border-green-500/30">
    <div className="text-xs text-green-400">Status</div>
    <div className={`text-lg font-semibold ${
      selectedUser.isActive ? "text-green-500" : "text-gray-400"
    }`}>
      {selectedUser.isActive ? "Online" : "Offline"}
    </div>
  </div>

  <div className="border rounded-xl p-4 bg-blue-500/10 border-blue-500/30">
    <div className="text-xs text-blue-400">Last Active</div>
    <div className="text-sm">
      {selectedUser.lastLocationAt
        ? new Date(selectedUser.lastLocationAt).toLocaleString()
        : "No activity"}
    </div>
  </div>

  <div className="border rounded-xl p-4 bg-purple-500/10 border-purple-500/30">
    <div className="text-xs text-purple-400">Today Work</div>
    <div className="text-lg font-semibold">
      {selectedUser.todayWorkMinutes} min
    </div>
  </div>

</div>
        {/* STATS GRID */}
<div className="grid grid-cols-4 gap-4">

  <div className="border rounded-lg p-4 bg-purple-500/10 border-purple-500/30">
    <div className="text-xs text-purple-400">Total Assigned</div>
    <div className="text-xl font-semibold">{selectedUser.assignedCount}</div>
  </div>

  <div className="border rounded-lg p-4 bg-red-500/10 border-red-500/30">
    <div className="text-xs text-red-400">Pending</div>
    <div className="text-xl font-semibold">{selectedUser.pendingCount}</div>
  </div>

  <div className="border rounded-lg p-4 bg-green-500/10 border-green-500/30">
    <div className="text-xs text-green-400">Completed</div>
    <div className="text-xl font-semibold">{selectedUser.completedCount}</div>
  </div>

  <div className="border rounded-lg p-4 bg-emerald-500/10 border-emerald-500/30">
    <div className="text-xs text-emerald-400">Approved</div>
    <div className="text-xl font-semibold">{selectedUser.approvedCount}</div>
  </div>

</div>
{/* SESSION HISTORY */}
<div>
  <div className="text-sm font-semibold mb-3">
    Recent Sessions
  </div>

  <div className="border rounded-xl overflow-hidden">
    <div className="max-h-[220px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="p-4 text-left">Login</th>
            <th className="p-4 text-left">Logout</th>
            <th className="p-4 text-left">Duration</th>
          </tr>
        </thead>
        <tbody>
          {selectedUser.sessions?.map(session => {
            const login = new Date(session.loginAt);
            const logout = session.logoutAt
              ? new Date(session.logoutAt)
              : null;

            const durationMs = logout
              ? logout - login
              : Date.now() - login;

            const minutes = Math.floor(durationMs / 60000);

            return (
              <tr key={session._id} className="border-t">
                <td className="p-4">
                  {login.toLocaleString()}
                </td>
                <td className="p-4">
                  {logout ? logout.toLocaleString() : "Active"}
                </td>
                <td className="p-4 font-medium">
                  {minutes} min
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
</div>
        {/* FOOTER */}
        <div className="flex justify-end">
          <Button onClick={() => setProfileOpen(false)}>
            Close
          </Button>
        </div>

      </div>
    </div>
  </div>
)}


    </div>
  );
}
