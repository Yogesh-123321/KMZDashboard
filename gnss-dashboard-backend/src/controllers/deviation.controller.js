const Assignment = require("../models/Assignment");

const R = 6378137; // Earth radius (meters)

/* ───────── Lat/Lon → Local Cartesian (meters) ───────── */
function latLonToXY(lat, lon, refLat) {
  const x =
    (lon * Math.PI / 180) *
    R *
    Math.cos(refLat * Math.PI / 180);

  const y =
    (lat * Math.PI / 180) *
    R;

  return { x, y };
}

/* ───────── Cartesian → Lat/Lon ───────── */
function xyToLatLon(x, y, refLat) {
  const lat =
    (y / R) * (180 / Math.PI);

  const lon =
    (x / (R * Math.cos(refLat * Math.PI / 180))) *
    (180 / Math.PI);

  return { lat, lon };
}

/* ───────── Point → Segment Distance (with projection) ───────── */
function pointToSegmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Degenerate segment (A == B)
  if (dx === 0 && dy === 0) {
    const distance = Math.sqrt(
      (p.x - a.x) ** 2 +
      (p.y - a.y) ** 2
    );

    return {
      distance,
      projX: a.x,
      projY: a.y
    };
  }

  // Projection factor
  const t =
    ((p.x - a.x) * dx +
     (p.y - a.y) * dy) /
    (dx * dx + dy * dy);

  // Clamp projection to segment
  const tClamped = Math.max(0, Math.min(1, t));

  const projX = a.x + tClamped * dx;
  const projY = a.y + tClamped * dy;

  const distance = Math.sqrt(
    (p.x - projX) ** 2 +
    (p.y - projY) ** 2
  );

  return {
    distance,
    projX,
    projY
  };
}

/* ───────── Deviation Analysis Controller ───────── */
exports.getDeviationAnalysis = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        message: "Assignment not found"
      });
    }

    const threshold = Number(req.query.threshold || 3);
    const thresholdKey = String(threshold);

    /* ───────── Cache Check ───────── */
    const cached =
      assignment.deviationAnalyses?.get(thresholdKey);

    if (
      cached &&
      typeof cached.maxDeviation === "number" &&
      typeof cached.avgDeviation === "number" &&
      Array.isArray(cached.deviations)
    ) {
      return res.json({
        cached: true,
        ...cached
      });
    }

    const refSegments = assignment.referenceTrack || [];
    const recSegments = assignment.recordedTrack || [];

    if (!refSegments.length || !recSegments.length) {
      return res.status(400).json({
        message: "Reference or recorded track missing"
      });
    }

    let deviations = [];
    let maxDeviation = 0;
    let sumDeviation = 0;
    let deviatedPoints = 0;

    /* ───────── Main Comparison Loop ───────── */
    for (const recSeg of recSegments) {
      for (const recPoint of recSeg) {

        if (
          typeof recPoint.lat !== "number" ||
          typeof recPoint.lon !== "number"
        ) continue;

        const refLat = recPoint.lat;

        const pXY = latLonToXY(
          recPoint.lat,
          recPoint.lon,
          refLat
        );

        let minDist = Infinity;
        let bestProjection = null;

        // Compare against ALL reference segments
        for (const refSeg of refSegments) {
          for (let j = 0; j < refSeg.length - 1; j++) {

            const a = latLonToXY(
              refSeg[j].lat,
              refSeg[j].lon,
              refLat
            );

            const b = latLonToXY(
              refSeg[j + 1].lat,
              refSeg[j + 1].lon,
              refLat
            );

            const result =
              pointToSegmentDistance(pXY, a, b);

            if (result.distance < minDist) {
              minDist = result.distance;
              bestProjection = result;
            }
          }
        }

        if (!isFinite(minDist) || !bestProjection) continue;

        const isDeviated = minDist > threshold;

        if (isDeviated) deviatedPoints++;
        if (minDist > maxDeviation) maxDeviation = minDist;

        sumDeviation += minDist;

        // Convert projected XY back to Lat/Lon
        const projectedLatLon =
          xyToLatLon(
            bestProjection.projX,
            bestProjection.projY,
            refLat
          );

        deviations.push({
          lat: recPoint.lat,
          lon: recPoint.lon,
          deviation: minDist,
          deviated: isDeviated,

          // 🔹 NEW FIELDS
          projectedLat: projectedLatLon.lat,
          projectedLon: projectedLatLon.lon
        });
      }
    }

    const totalPoints = deviations.length;

    const avgDeviation =
      totalPoints > 0
        ? sumDeviation / totalPoints
        : 0;

    const deviationPercent =
      totalPoints > 0
        ? (deviatedPoints / totalPoints) * 100
        : 0;

    const result = {
      threshold,
      totalPoints,
      deviatedPoints,
      deviationPercent,
      maxDeviation,
      avgDeviation,
      deviations,
      computedAt: new Date()
    };

    /* ───────── Cache Store ───────── */
    if (!assignment.deviationAnalyses) {
      assignment.deviationAnalyses = new Map();
    }

    assignment.deviationAnalyses.set(
      thresholdKey,
      result
    );

    await assignment.save();

    res.json({
      cached: false,
      ...result
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Deviation calculation failed"
    });
  }
};