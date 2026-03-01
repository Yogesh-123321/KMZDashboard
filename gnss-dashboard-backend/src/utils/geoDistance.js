const EARTH_RADIUS = 6371000; // meters

function toRad(deg) {
  return deg * Math.PI / 180;
}

// Convert lat/lon to local meters (Equirectangular projection)
function projectToMeters(lat, lon, refLat) {
  const x = toRad(lon) * EARTH_RADIUS * Math.cos(toRad(refLat));
  const y = toRad(lat) * EARTH_RADIUS;
  return { x, y };
}

function distancePointToSegment(p, a, b) {

  const refLat = p.lat; // local reference latitude

  const P = projectToMeters(p.lat, p.lon, refLat);
  const A = projectToMeters(a.lat, a.lon, refLat);
  const B = projectToMeters(b.lat, b.lon, refLat);

  const ABx = B.x - A.x;
  const ABy = B.y - A.y;

  const APx = P.x - A.x;
  const APy = P.y - A.y;

  const abSquared = ABx * ABx + ABy * ABy;

  if (abSquared === 0) {
    // A and B are same point
    return Math.sqrt(APx * APx + APy * APy);
  }

  // Projection scalar (clamped)
  let t = (APx * ABx + APy * ABy) / abSquared;
  t = Math.max(0, Math.min(1, t));

  const closestX = A.x + t * ABx;
  const closestY = A.y + t * ABy;

  const dx = P.x - closestX;
  const dy = P.y - closestY;

  return Math.sqrt(dx * dx + dy * dy);
}

function calculateMinDistance(userPoint, referenceTrack) {

  let minDistance = Infinity;

  referenceTrack.forEach(segment => {
    for (let i = 0; i < segment.length - 1; i++) {

      const dist = distancePointToSegment(
        userPoint,
        segment[i],
        segment[i + 1]
      );

      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  });

  return minDistance;
}

module.exports = {
  calculateMinDistance
};