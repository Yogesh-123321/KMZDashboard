import { useEffect, useState } from "react";
import { fetchKmzFiles } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import AssignSurveyPage from "./AssignSurveyPage";
import InventoryManagement from "./InventoryManagement";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function AdminDashboard() {
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchKmzFiles().then(setFiles);

    fetch(`${API_BASE_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(r => r.json())
      .then(setUsers);
  }, []);

  async function assign() {
    if (!selectedFile || !selectedUser) return;

    await fetch(`${API_BASE_URL}/api/assignments/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
     body: JSON.stringify({
  surveyId: selectedFile.id,
  userId: selectedUser
})

    });

    alert("Assigned!");
  }

  return (
  <AdminLayout>
    {({ selectedFile }) => {
      return <AssignSurveyPage selectedFile={selectedFile} />;
    }}
  </AdminLayout>
);

}
