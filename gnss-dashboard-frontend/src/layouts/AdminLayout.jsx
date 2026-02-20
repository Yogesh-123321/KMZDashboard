import { useState } from "react";
import KmzExplorer from "@/components/KmzExplorer";

export default function AdminLayout({ children }) {
  const [activePage, setActivePage] = useState("assign");
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <div className="flex flex-col min-h-screen">

      <div className="flex flex-1 min-h-0">
        <KmzExplorer onSelectFile={setSelectedFile} />

        <div className="flex-1 overflow-y-auto p-6">
          {children({ activePage, selectedFile })}
        </div>
      </div>

    </div>
  );
}


