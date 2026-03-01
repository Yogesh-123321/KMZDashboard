import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ThemeToggle from "@/components/ThemeToggle";
import Login from "./pages/Login";
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";

import SurveyDashboard from "@/components/SurveyDashboard";
import SurveyView from "@/components/SurveyView";
import AdminDashboard from "./pages/AdminDashboard";
import UploadKmz from "./pages/UploadKmz";
import ManageSurveyors from "./pages/ManageSurveyors";
import FieldSurveyStatus from "./pages/FieldSurveyStatus";
import ApprovalPage from "./pages/ApprovalPage";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [adminPage, setAdminPage] = useState("upload");
  const [profileOpen, setProfileOpen] = useState(false);

  const [surveyorProfile, setSurveyorProfile] = useState(null);
  const [surveyorProfileOpen, setSurveyorProfileOpen] = useState(false);

  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username");

 const handleLogout = async () => {
  try {
    await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );
  } catch (err) {
    console.error("Logout error:", err);
  }

  localStorage.clear();
  setLoggedIn(false);
};

  async function openSurveyorProfile(userId) {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/api/admin/users/${userId}/profile`,
      {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("token")
        }
      }
    );

    const profile = await res.json();
    setSurveyorProfile(profile);
    setSurveyorProfileOpen(true);
  }

  /* ---------- DASHBOARD LAYOUT ---------- */
  const DashboardLayout = () => (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="relative z-40 flex items-center justify-between px-6 py-4 border-b bg-background">

        {/* LEFT SIDE NAV */}
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-semibold">GNSS Dashboard</h1>

          {(role === "ADMIN" || role === "ROLE_5") && (
            <div className="flex items-center gap-6">

              {role === "ADMIN" && (
                <>
                  {/* Upload */}
                  <button
                    onClick={() => setAdminPage("upload")}
                    className={`relative pb-2 text-sm font-medium transition-colors ${
                      adminPage === "upload"
                        ? "text-blue-600"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload and Edit Survey
                    {adminPage === "upload" && (
                      <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
                    )}
                  </button>

                  {/* Assign */}
                  <button
                    onClick={() => setAdminPage("assign")}
                    className={`relative pb-2 text-sm font-medium transition-colors ${
                      adminPage === "assign"
                        ? "text-blue-600"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Assign Survey
                    {adminPage === "assign" && (
                      <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
                    )}
                  </button>

                  {/* Surveyors */}
                  <button
                    onClick={() => setAdminPage("surveyors")}
                    className={`relative pb-2 text-sm font-medium transition-colors ${
                      adminPage === "surveyors"
                        ? "text-blue-600"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Manage Surveyors
                    {adminPage === "surveyors" && (
                      <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
                    )}
                  </button>

                  {/* Status */}
                  <button
                    onClick={() => setAdminPage("status")}
                    className={`relative pb-2 text-sm font-medium transition-colors ${
                      adminPage === "status"
                        ? "text-blue-600"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Field Survey Status
                    {adminPage === "status" && (
                      <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
                    )}
                  </button>
                </>
              )}

              {/* Approval (Visible to ADMIN + ROLE_5) */}
              <button
                onClick={() => setAdminPage("approval")}
                className={`relative pb-2 text-sm font-medium transition-colors ${
                  adminPage === "approval"
                    ? "text-blue-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Approval Queue
                {adminPage === "approval" && (
                  <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
                )}
              </button>

            </div>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4 relative">
          <ThemeToggle />

          <div
            className="flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-1 hover:bg-muted"
            onClick={() => setProfileOpen(prev => !prev)}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-semibold">
              {username?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-sm">{username}</div>
          </div>

          {profileOpen && (
            <div className="absolute right-0 top-12 z-50 bg-card border rounded-lg shadow-md p-4 w-48">
              <div className="text-sm font-medium">{username}</div>
              <div className="text-xs text-muted-foreground mb-3">
                {role}
              </div>

              <button
                onClick={handleLogout}
                className="w-full border rounded px-2 py-1 text-sm hover:bg-muted"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden">
        {(role === "ADMIN" || role === "ROLE_5") ? (
          <>
            {role === "ADMIN" && adminPage === "upload" && <UploadKmz />}
            {role === "ADMIN" && adminPage === "assign" && <AdminDashboard />}
            {role === "ADMIN" && adminPage === "surveyors" && (
              <ManageSurveyors onOpenProfile={openSurveyorProfile} />
            )}
            {role === "ADMIN" && adminPage === "status" && <FieldSurveyStatus />}
            {adminPage === "approval" && <ApprovalPage />}
          </>
        ) : selectedAssignment ? (
          <SurveyView
            assignment={selectedAssignment}
            onBack={() => setSelectedAssignment(null)}
          />
        ) : (
          <SurveyDashboard onOpenSurvey={setSelectedAssignment} />
        )}
      </main>

      {/* PROFILE MODAL */}
      {surveyorProfileOpen && surveyorProfile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border rounded-2xl shadow-xl w-[460px] p-6 space-y-4">
            <div className="text-lg font-semibold">
              {surveyorProfile.username}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded">
                Assigned: {surveyorProfile.assignedCount}
              </div>
              <div className="p-3 border rounded">
                Pending: {surveyorProfile.pendingCount}
              </div>
              <div className="p-3 border rounded">
                In Progress: {surveyorProfile.inProgressCount}
              </div>
              <div className="p-3 border rounded">
                Completed: {surveyorProfile.completedCount}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSurveyorProfileOpen(false)}
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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/login"
          element={<Login onLogin={() => setLoggedIn(true)} />}
        />
        <Route
          path="/dashboard"
          element={
            loggedIn ? <DashboardLayout /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;