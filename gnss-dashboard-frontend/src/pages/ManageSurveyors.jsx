import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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

  /* NEW STATE */
  const [selectedUser, setSelectedUser] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
  }

  useEffect(() => {
    loadUsers();
  }, []);

  /* ---------------- CREATE ---------------- */

  async function createUser() {
    if (!form.username || !form.password) return;

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
        role: user.role
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


  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 space-y-6">
      <div className="text-xl font-semibold">Manage Surveyors</div>

      {/* ADD USER */}
      <div className="flex gap-3">
        <Input
          placeholder="Username"
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
        />

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

        <Button onClick={createUser}>Add User</Button>
      </div>

      {/* USERS TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Password</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-40">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map(user => {
            const isEditing = editingId === user._id;

            return (
              <TableRow
                key={user._id}
                className="cursor-pointer odd:bg-muted even:bg-card hover:bg-muted/60 transition"
                onClick={() => openProfile(user)}
              >

                {/* USERNAME */}
                <TableCell>
                  {isEditing ? (
                    <Input
                      value={user.username}
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
                  ) : (
                    user.username
                  )}
                </TableCell>

                {/* PASSWORD */}
                <TableCell className="flex items-center gap-2">
                  {showPassword[user._id]
                    ? user.passwordPlain || "••••••••"
                    : "••••••••"}

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowPassword(prev => ({
                        ...prev,
                        [user._id]: !prev[user._id]
                      }));
                    }}
                  >
                    {showPassword[user._id] ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </TableCell>

                {/* ROLE */}
                <TableCell>
                  {isEditing ? (
                    <select
                      className="border rounded px-2 py-1"
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
                </TableCell>

                {/* ACTIONS */}
                <TableCell className="flex gap-2">
                  {isEditing ? (
                    <Button
                      onClick={e => {
                        e.stopPropagation();
                        saveEdit(user);
                      }}
                    >
                      Save
                    </Button>
                  ) : (
                    <Button
                      onClick={e => {
                        e.stopPropagation();
                        startEdit(user);
                      }}
                    >
                      Edit
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    onClick={e => {
                      e.stopPropagation();
                      deleteUser(user._id);
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* PROFILE MODAL */}
     {profileOpen && selectedUser && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-card text-card-foreground border rounded-2xl shadow-xl w-[460px] overflow-hidden">

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
      <div className="p-6 space-y-5">

        {/* STATS GRID */}
<div className="grid grid-cols-2 gap-3">

  <div className="border rounded-lg p-3 bg-purple-500/10 border-purple-500/30">
    <div className="text-xs text-purple-400">Total Assigned</div>
    <div className="text-xl font-semibold">{selectedUser.assignedCount}</div>
  </div>

  <div className="border rounded-lg p-3 bg-red-500/10 border-red-500/30">
    <div className="text-xs text-red-400">Pending</div>
    <div className="text-xl font-semibold">{selectedUser.pendingCount}</div>
  </div>

  <div className="border rounded-lg p-3 bg-blue-500/10 border-blue-500/30">
    <div className="text-xs text-blue-400">In Progress</div>
    <div className="text-xl font-semibold">{selectedUser.inProgressCount}</div>
  </div>

  <div className="border rounded-lg p-3 bg-green-500/10 border-green-500/30">
    <div className="text-xs text-green-400">Completed</div>
    <div className="text-xl font-semibold">{selectedUser.completedCount}</div>
  </div>

  <div className="border rounded-lg p-3 bg-emerald-500/10 border-emerald-500/30">
    <div className="text-xs text-emerald-400">Approved</div>
    <div className="text-xl font-semibold">{selectedUser.approvedCount}</div>
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
