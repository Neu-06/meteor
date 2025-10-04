'use client';

// Math helpers
export const toRad = (d) => (d * Math.PI) / 180;
export const toDeg = (r) => (r * 180) / Math.PI;

// Forward geodesic on a sphere using bearing and distance (in meters)
export function forwardGeodesic(latDeg, lonDeg, bearingDeg, distanceMeters) {
  const lat1 = toRad(latDeg);
  const lon1 = toRad(lonDeg);
  const brng = toRad(bearingDeg);
  const R = 6371008.8; // mean Earth radius (m)
  const delta = distanceMeters / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(delta) +
      Math.cos(lat1) * Math.sin(delta) * Math.cos(brng)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lon: ((toDeg(lon2) + 540) % 360) - 180 };
}

// Kinetic energy estimate and approximate blast radius (very rough model)
export function energyAndRadius(diameter_m, density_kgm3, speed_kms) {
  const r = diameter_m / 2;
  const volume = (4 / 3) * Math.PI * r ** 3; // m^3
  const mass = volume * density_kgm3; // kg
  const v = speed_kms * 1000; // m/s
  const E = 0.5 * mass * v * v; // J
  const MT = E / 4.184e15; // megatons of TNT
  const R_km = 1.8 * Math.cbrt(MT); // ~5 psi radius approximation
  return { E_J: E, MT, R_km };
}

// Soft heat disk (radial gradient) as a canvas
export function makeHeatDisk(size = 512, color = 'rgba(255,140,0,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.25, color);
  g.addColorStop(0.6, 'rgba(255,120,0,0.25)');
  g.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}
