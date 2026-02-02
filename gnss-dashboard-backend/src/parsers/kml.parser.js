const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");

/* ───────── Utilities ───────── */

/**
 * Collect ALL Placemark nodes (deep, recursive)
 */
function collectPlacemarks(node, out = []) {
  if (!node || typeof node !== "object") return out;

  if (node.Placemark) {
    Array.isArray(node.Placemark)
      ? out.push(...node.Placemark)
      : out.push(node.Placemark);
  }

  for (const key in node) {
    collectPlacemarks(node[key], out);
  }

  return out;
}

/**
 * Recursively find ALL gx:Track objects
 * (handles MultiGeometry, folders, photo exports)
 */
function findGxTracks(node, out = []) {
  if (!node || typeof node !== "object") return out;

  // gx:Track after namespace removal → Track
  if (node.Track && node.Track.coord) {
    out.push(node.Track);
  }

  for (const key in node) {
    findGxTracks(node[key], out);
  }

  return out;
}

/**
 * Parse gx:Track → lat/lon points
 */
function parseGxTrack(track) {
  const coords = Array.isArray(track.coord)
    ? track.coord
    : [track.coord];

  return coords
    .map(c => {
      if (typeof c !== "string") return null;
      const [lon, lat, ele] = c.split(" ").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon, ele: ele ?? 0 };
    })
    .filter(Boolean);
}

/**
 * Parse LineString coordinates
 */
function parseLineString(coordsNode) {
  const text =
    typeof coordsNode === "string"
      ? coordsNode
      : coordsNode?.["#text"] || "";

  return text
    .trim()
    .split(/\s+/)
    .map(c => {
      const [lon, lat, ele] = c.split(",").map(Number);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon, ele: ele ?? 0 };
    })
    .filter(Boolean);
}

/* ───────── Main Parser ───────── */

function parseKml(kmlPath) {
  const xml = fs.readFileSync(kmlPath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true // gx:Track → Track
  });

  const json = parser.parse(xml);

  // 🔍 Collect everything
  const placemarks = collectPlacemarks(json.kml);

  const tracks = [];
  const points = [];

  for (const pm of placemarks) {
    /* ───── ORIGINAL TRACK (gx:Track) ───── */
    const gxTracks = findGxTracks(pm);

    for (const t of gxTracks) {
      const coords = parseGxTrack(t);
      if (coords.length > 1) {
        tracks.push({
          name: pm.name || "Track Session 1",
          coordinates: coords,
          source: "gx:Track"
        });
      }
    }

    /* ───── EDITED TRACK (LineString) ───── */
    if (pm.LineString?.coordinates) {
      const coords = parseLineString(pm.LineString.coordinates);
      if (coords.length > 1) {
        tracks.push({
          name: pm.name || "Edited Track",
          coordinates: coords,
          source: "LineString"
        });
      }
    }

    /* ───── PHOTO POINTS ───── */
    if (pm.Point?.coordinates) {
      const [lon, lat, ele] = pm.Point.coordinates
        .trim()
        .split(",")
        .map(Number);

      points.push({
        name: pm.name || "Point",
        lat,
        lon,
        ele: ele ?? 0,
        imageFile:
          pm.name && pm.name.startsWith("Photo @")
            ? `${pm.name.replace("Photo @", "").trim()}.jpg`
            : null
      });
    }
  }

  console.log("PARSED TRACK COUNT:", tracks.length);

  return { tracks, points };
}

module.exports = { parseKml };
