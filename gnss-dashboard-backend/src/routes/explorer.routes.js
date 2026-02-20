const express = require("express");
const ExplorerTree = require("../models/ExplorerTree");

const router = express.Router();

router.get("/", async (req, res) => {
  let tree = await ExplorerTree.findOne();

  if (!tree) {
    tree = await ExplorerTree.create({
      folders: [{ id: "root", name: "Root", parent: null }],
      fileFolderMap: {}
    });
  }

  res.json({
    folders: tree.folders || [],
    fileFolderMap: tree.fileFolderMap || {}
  });
});


/* SAVE explorer tree */
router.post("/", async (req, res) => {
  try {
    const folders = req.body.folders || [];
    const fileFolderMap = req.body.fileFolderMap || {};

    let tree = await ExplorerTree.findOne();

    if (!tree) {
      tree = new ExplorerTree({ folders, fileFolderMap });
    } else {
      tree.folders = folders;
      tree.fileFolderMap = fileFolderMap;
    }

    await tree.save();

    res.json({ success: true });
  } catch (err) {
    console.error("Explorer save error:", err);
    res.status(500).json({ error: "Failed to save explorer tree" });
  }
});


module.exports = router;
