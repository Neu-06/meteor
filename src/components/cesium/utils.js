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

// Kinetic energy estimate and blast radii based on overpressure levels
export function energyAndRadius(diameter_m, density_kgm3, speed_kms) {
  const r = diameter_m / 2;
  const volume = (4 / 3) * Math.PI * r ** 3; // m^3
  const mass = volume * density_kgm3; // kg
  const v = speed_kms * 1000; // m/s
  const E = 0.5 * mass * v * v; // J
  const MT = E / 4.184e15; // megatons of TNT
  const KT = MT * 1000; // kilotons of TNT

  // Scaling law for blast radius: R = C × Y^(1/3)
  // where Y is yield in kilotons, C depends on overpressure
  // Using empirical constants from nuclear blast data

  const R_20psi = 0.14 * Math.pow(KT, 1 / 3); // Complete destruction (km)
  const R_5psi = 0.28 * Math.pow(KT, 1 / 3);  // Severe structural damage (km)
  const R_1psi = 0.56 * Math.pow(KT, 1 / 3);  // Window breakage (km)

  // Thermal radiation radius (3rd degree burns)
  // For airbursts: R_thermal ≈ 0.4 × Y^(1/2) km for clear day
  const R_thermal = 0.4 * Math.sqrt(KT);

  return {
    E_J: E,
    MT,
    KT,
    R_20psi,
    R_5psi,
    R_1psi,
    R_thermal
  };
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
  g.addColorStop(0, 'rgba(255,200,0,0.55)');
  g.addColorStop(0.3, 'rgba(255,140,0,0.45)');
  g.addColorStop(0.7, 'rgba(255,120,0,0.25)');
  g.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  return c;
}
