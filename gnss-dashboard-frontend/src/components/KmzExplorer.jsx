import { useEffect, useState, useRef } from "react";
import {
  fetchKmzFiles,
  fetchExplorerTree,
  saveExplorerTree
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File
} from "lucide-react";

export default function KmzExplorer({ onSelectFile }) {
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([
    { id: "root", name: "Root", parent: null }
  ]);
  const [fileFolderMap, setFileFolderMap] = useState({});
  const [newFolderName, setNewFolderName] = useState("");
  const [expanded, setExpanded] = useState({ root: true });
  const [menu, setMenu] = useState(null);

  const loaded = useRef(false);
const [selectedFileId, setSelectedFileId] = useState(null);
const [selectedFolderId, setSelectedFolderId] = useState("root");

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    fetchKmzFiles().then(driveFiles => {
      setFiles(driveFiles.filter(f => f.name?.endsWith(".kmz")));
    });

    fetchExplorerTree().then(tree => {
      setFolders(tree.folders || [{ id: "root", name: "Root", parent: null }]);
      setFileFolderMap(tree.fileFolderMap || {});
      loaded.current = true;
    });
  }, []);

  /* ---------------- SAVE ---------------- */

  useEffect(() => {
    if (!loaded.current) return;
    saveExplorerTree({ folders, fileFolderMap });
  }, [folders, fileFolderMap]);

  /* ---------------- FOLDER OPS ---------------- */

  function createFolder() {
    if (!newFolderName.trim()) return;

    const id = "f_" + Date.now();

    setFolders(prev => [
      ...prev,
      { id, name: newFolderName, parent: "root" }
    ]);

    setExpanded(prev => ({ ...prev, [id]: true }));
    setNewFolderName("");
  }

  function renameFolder(folderId) {
    const folder = folders.find(f => f.id === folderId);
    const name = prompt("Rename folder", folder.name);
    if (!name) return;

    setFolders(prev =>
      prev.map(f => (f.id === folderId ? { ...f, name } : f))
    );
  }

  function deleteFolder(folderId) {
    setFolders(prev => prev.filter(f => f.id !== folderId));
  }

  /* ---------------- TREE ---------------- */

  function toggleFolder(folderId) {
    setExpanded(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  }

  function onDragStart(e, file) {
    e.dataTransfer.setData("fileId", file.id);
  }
function onFolderDragStart(e, folderId) {
  e.dataTransfer.setData("folderId", folderId);
}
function onDropOnFolder(e, targetFolderId) {
  e.preventDefault();

  const fileId = e.dataTransfer.getData("fileId");
  const folderId = e.dataTransfer.getData("folderId");

  /* FILE MOVE */
  if (fileId) {
    setFileFolderMap(prev => ({
      ...prev,
      [fileId]: targetFolderId === "root" ? null : targetFolderId
    }));
  }

  /* FOLDER MOVE */
  if (folderId && folderId !== "root" && folderId !== targetFolderId) {
    setFolders(prev =>
      prev.map(f =>
        f.id === folderId ? { ...f, parent: targetFolderId } : f
      )
    );
  }
}


  function allowDrop(e) {
    e.preventDefault();
  }

  /* ---------------- CONTEXT MENU ---------------- */

  function openFolderMenu(e, folderId) {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      type: "folder",
      id: folderId
    });
  }

  function openFileMenu(e, file) {
    e.preventDefault();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      type: "file",
      file
    });
  }

  function closeMenu() {
    setMenu(null);
  }

  /* ---------------- RENDER TREE ---------------- */

  function renderFolder(folderId, depth = 0) {
    const subFolders = folders.filter(f => f.parent === folderId);

    const folderFiles = files.filter(f => {
      if (folderId === "root") {
        return !fileFolderMap[f.id];
      }
      return fileFolderMap[f.id] === folderId;
    });

    return (
      <div key={folderId}>
        <div
  draggable={folderId !== "root"}
  onDragStart={(e) => onFolderDragStart(e, folderId)}
  style={{ paddingLeft: depth * 14 }}
  className={`flex items-center gap-1 cursor-pointer select-none rounded px-1 py-[2px]
  ${
    selectedFolderId === folderId
      ? "bg-blue-500/20"
      : "hover:bg-muted/50"
  }`}
  onClick={() => {
    toggleFolder(folderId);
    setSelectedFolderId(folderId);
    setSelectedFileId(null);
  }}
  onDragOver={allowDrop}
  onDrop={(e) => onDropOnFolder(e, folderId)}
  onContextMenu={(e) => openFolderMenu(e, folderId)}
>

          {expanded[folderId] ? (
            <ChevronDown size={16} />
          ) : (
            <ChevronRight size={16} />
          )}

          <Folder size={16} className="text-yellow-500" />

<span className="text-sm font-medium">
  {folders.find(f => f.id === folderId)?.name || "Root"}
</span>

        </div>

        {expanded[folderId] && (
          <div>
            {subFolders.map(f => renderFolder(f.id, depth + 1))}

            {folderFiles.map(file => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => onDragStart(e, file)}
                onContextMenu={(e) => openFileMenu(e, file)}
                style={{ paddingLeft: (depth + 1) * 14 }}
className={`flex items-center gap-2 cursor-pointer text-sm rounded px-1 py-[2px]
${
  selectedFileId === file.id
    ? "bg-blue-500/20"
    : "hover:bg-muted/50"
}`}

             onClick={() => {
  setSelectedFileId(file.id);
  setSelectedFolderId(null);
  onSelectFile(file);
}}
 >
                <File size={16} className="text-green-500" />
<span>{file.name}</span>

              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="w-80 border-r flex flex-col h-full min-h-0 bg-background">
      <div className="p-4 border-b space-y-3">
        <div className="font-semibold text-sm">KMZ Explorer</div>

        <div className="flex gap-2">
          <input
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name"
            className="border rounded-md px-2 py-1 text-sm w-full bg-background"
          />
          <Button size="sm" onClick={createFolder}>
            Add
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 text-sm">
  {renderFolder("root")}
</div>


      {/* CONTEXT MENU */}
      {menu && (
        <div
          className="fixed bg-popover border rounded shadow-md text-sm z-50"
          style={{ top: menu.y, left: menu.x }}
          onMouseLeave={closeMenu}
        >
          {menu.type === "folder" && (
            <>
              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer"
                onClick={() => {
                  renameFolder(menu.id);
                  closeMenu();
                }}
              >
                Rename
              </div>

              <div
                className="px-3 py-2 hover:bg-muted cursor-pointer text-red-500"
                onClick={() => {
                  deleteFolder(menu.id);
                  closeMenu();
                }}
              >
                Delete
              </div>
            </>
          )}

      {menu.type === "file" && (
  <>
    <div className="px-3 py-2 text-xs text-muted-foreground">
      Move to...
    </div>

    {folders
      .filter(f => f.id !== "root")
      .map(folder => (
        <div
          key={folder.id}
          className="px-3 py-2 hover:bg-muted cursor-pointer"
          onClick={() => {
            setFileFolderMap(prev => ({
              ...prev,
              [menu.file.id]: folder.id
            }));
            closeMenu();
          }}
        >
          📁 {folder.name}
        </div>
      ))}

    <div
      className="px-3 py-2 hover:bg-muted cursor-pointer border-t"
      onClick={() => {
        setFileFolderMap(prev => ({
          ...prev,
          [menu.file.id]: null
        }));
        closeMenu();
      }}
    >
      Root
    </div>
  </>
)}

        </div>
      )}
    </div>
  );
}
