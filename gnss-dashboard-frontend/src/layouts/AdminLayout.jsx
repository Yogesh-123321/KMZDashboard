import { useState } from "react";
import KmzExplorer from "@/components/KmzExplorer";

export default function AdminLayout({ children }) {
  const [activePage, setActivePage] = useState("assign");
  const [selectedFile, setSelectedFile] = useState(null);

  return (
<div className="flex h-[90dvh] overflow-hidden">
  <div className="w-80 h-full overflow-hidden">
  <KmzExplorer onSelectFile={setSelectedFile} />
</div>

  <div className="flex-1 flex flex-col min-h-0">

    <div className="flex gap-8 px-6 pt-4 border-b bg-background shrink-0">
          {["assign", "surveyors", "status"].map(page => (
            <button
              key={page}
              onClick={() => setActivePage(page)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activePage === page
                  ? "text-blue-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {page === "assign" && "Assign"}
              {page === "surveyors" && "Surveyors"}
              {page === "status" && "Field Status"}

              {activePage === page && (
                <span className="absolute left-0 bottom-0 h-[2px] w-full bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

    <div className="flex-1 overflow-y-auto p-6 min-h-0">
      {children({ activePage, selectedFile })}
    </div>
      </div>
    </div>
  );
}