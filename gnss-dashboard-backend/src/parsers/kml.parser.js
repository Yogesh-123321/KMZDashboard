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
 * (handles MultiGeometry, folders)
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

/**
 * Convert KML color (aabbggrr) → Leaflet hex (#rrggbb)
 */
function convertKmlColor(kmlColor) {
  if (!kmlColor || kmlColor.length !== 8) return "#3388ff";

  // Format = aabbggrr
  const rr = kmlColor.slice(6, 8);
  const gg = kmlColor.slice(4, 6);
  const bb = kmlColor.slice(2, 4);

  return `#${rr}${gg}${bb}`;
}

/* ───────── Main Parser ───────── */

function parseKml(kmlPath) {
  const xml = fs.readFileSync(kmlPath, "utf-8");

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true // gx:Track → Track
  });

  const json = parser.parse(xml);

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
          name: pm.name || "Track Session",
          coordinates: coords,
          source: "gx:Track",
          color: "#3388ff",
          width: 3
        });
      }
    }

    /* ───── LineString TRACK (with inline Style) ───── */
    if (pm.LineString?.coordinates) {
      const coords = parseLineString(pm.LineString.coordinates);

      if (coords.length > 1) {
        let color = "#3388ff"; // default
        let width = 3;

        if (pm.Style?.LineStyle?.color) {
          color = convertKmlColor(pm.Style.LineStyle.color);
        }

        if (pm.Style?.LineStyle?.width) {
          width = Number(pm.Style.LineStyle.width);
        }

        tracks.push({
          name: pm.name || "LineString Track",
          coordinates: coords,
          source: "LineString",
          color,
          width
        });
      }
    }

    /* ───── PHOTO POINTS ───── */
    if (pm.Point?.coordinates) {
      const [lon, lat, ele] = pm.Point.coordinates
        .trim()
        .split(",")
        .map(Number);

      if (Number.isFinite(lat) && Number.isFinite(lon)) {
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
  }

  console.log("PARSED TRACK COUNT:", tracks.length);

if (tracks.length > 0) {
  console.log("TRACK SAMPLE:", tracks[0]);
}

return { tracks, points };
}

module.exports = { parseKml };