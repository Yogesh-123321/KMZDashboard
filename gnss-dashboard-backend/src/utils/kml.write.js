/* kml.write.js */
const fs = require("fs");

/* ───────── Helper ───────── */
/* kml.write.js */

/* ───────── Helpers ───────── */

function formatCoordinates(coords) {
  return coords
    .map(p => `${p.lon},${p.lat},${p.ele ?? 0}`)
    .join("\n");
}

/* ───────── Append ORIGINAL Track as STATIC LineString ─────────
   This makes the original track ALWAYS visible,
   even if gx:Track parsing fails later.
*/
function appendOriginalTrackAsLineString(kml, originalCoords) {
  if (!Array.isArray(originalCoords) || originalCoords.length < 2) {
    return kml;
  }

  const coordText = formatCoordinates(originalCoords);

  const block = `
  <Placemark>
    <name>Original Track (Static)</name>
    <Style>
      <LineStyle>
        <color>ff2563eb</color> <!-- blue -->
        <width>4</width>
      </LineStyle>
    </Style>
    <LineString>
      <tessellate>1</tessellate>
      <coordinates>
${coordText}
      </coordinates>
    </LineString>
  </Placemark>
  `;

  // Append safely at Document level
  return kml.replace(
    "</Document>",
    `${block}\n</Document>`
  );
}

/* ───────── Append Edited Track (SAFE) ───────── */
function appendEditedTrackPlacemark(kml, editedTrack, name = "Edited Track") {
  if (!Array.isArray(editedTrack) || editedTrack.length < 2) {
    return kml;
  }

  const coordText = editedTrack
    .map(p => `${p.lon},${p.lat},${p.ele ?? 0}`)
    .join("\n");

  const placemark = `
<Placemark>
  <name>${name}</name>
  <Style>
    <LineStyle>
      <color>${process.env.EDITED_TRACK_COLOR || "ff00aaff"}</color>
      <width>4</width>
    </LineStyle>
  </Style>
  <LineString>
    <tessellate>1</tessellate>
    <coordinates>
${coordText}
    </coordinates>
  </LineString>
</Placemark>
`;

  return kml.replace("</Document>", `${placemark}\n</Document>`);
}


/* ───────── SAFE Photo Update (NON-DESTRUCTIVE) ───────── */
function replacePhotoPoints(kml, editedPoints) {
  if (!Array.isArray(editedPoints)) return kml;

  let updated = kml;

  editedPoints.forEach(p => {
    const coordRegex = new RegExp(
      `(<Placemark>[\\s\\S]*?<name>${p.name}</name>[\\s\\S]*?<Point>[\\s\\S]*?<coordinates>)([\\s\\S]*?)(</coordinates>)`,
      "m"
    );

    updated = updated.replace(
      coordRegex,
      `$1${p.lon},${p.lat},${p.ele ?? 0}$3`
    );
  });

  // 🔥 GOOGLE EARTH FIX
  // Remove `images/` prefix from photo <img> tags
  updated = updated.replace(
    /<img\s+src="images\//g,
    '<img src="'
  );

  return updated;
}

/* ✅ REMOVE ALL TRACK PLACEMARKS (SAFE) */
function removeAllTrackPlacemarks(kml) {
  return kml.replace(
    /<Placemark>[\s\S]*?(<LineString>|<gx:Track>)[\s\S]*?<\/Placemark>/g,
    ""
  );
}
module.exports = {
  replacePhotoPoints,
  appendOriginalTrackAsLineString,
  appendEditedTrackPlacemark,
  removeAllTrackPlacemarks
};


