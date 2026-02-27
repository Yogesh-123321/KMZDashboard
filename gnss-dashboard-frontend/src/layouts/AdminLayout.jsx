import { useState } from "react";
import KmzExplorer from "@/components/KmzExplorer";

export default function AdminLayout({ children }) {
  const [activePage] = useState("assign"); // no need to switch anymore
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <div className="flex h-[90dvh] overflow-hidden">
      <div className="w-80 h-full overflow-hidden">
        <KmzExplorer onSelectFile={setSelectedFile} />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {children({ activePage, selectedFile })}
        </div>
      </div>
    </div>
  );
}