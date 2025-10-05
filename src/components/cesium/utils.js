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

// Modelos matemáticos mejorados para impactos de meteoritos
export function energyAndRadius(diameter_m, density_kgm3, speed_kms) {
  const r = diameter_m / 2;
  const volume = (4 / 3) * Math.PI * r ** 3; // m^3
  const mass = volume * density_kgm3; // kg
  const v = speed_kms * 1000; // m/s
  
  // Energía cinética inicial
  const E_kinetic = 0.5 * mass * v * v; // J
  
  // Factor de eficiencia para impactos atmosféricos (0.1-0.3 típico)
  // Meteoritos pequeños pierden más energía en la atmósfera
  const efficiency = diameter_m < 50 ? 0.05 : 
                    diameter_m < 200 ? 0.15 : 
                    diameter_m < 1000 ? 0.25 : 0.35;
  
  const E_effective = E_kinetic * efficiency; // Energía efectiva al impacto
  const MT = E_effective / 4.184e15; // megatons de TNT
  const KT = MT * 1000; // kilotons de TNT

  // Modelos de scaling mejorados basados en estudios de impactos reales
  // Incorporan correcciones por densidad atmosférica y tipo de impacto
  
  // Constantes mejoradas basadas en estudios de Glasstone & Dolan (1977) 
  // y modelos actualizados de impactos de meteoritos
  const altitude_factor = 1.0; // Factor para explosiones a nivel del suelo
  
  // Radios de sobrepresión (km) - modelos actualizados
  const R_20psi = 0.12 * Math.pow(KT * altitude_factor, 1/3); // Destrucción total
  const R_5psi = 0.24 * Math.pow(KT * altitude_factor, 1/3);  // Daño estructural severo  
  const R_1psi = 0.48 * Math.pow(KT * altitude_factor, 1/3);  // Rotura de ventanas

  // Modelo térmico mejorado para impactos de meteoritos
  // Basado en Collins et al. (2005) - Earth Impact Effects Program
  const thermal_efficiency = 0.3; // Fracción de energía convertida en radiación térmica
  const R_thermal = 0.35 * Math.sqrt(KT * thermal_efficiency); // Radio térmico (3er grado burns)
  
  // Corrección por absorción atmosférica para radiación térmica
  const atmospheric_transmission = 0.7; // Transmisión atmosférica promedio
  const R_thermal_corrected = R_thermal * Math.sqrt(atmospheric_transmission);

  return {
    E_J: E_kinetic,
    E_effective_J: E_effective,
    MT,
    KT,
    efficiency,
    R_20psi,
    R_5psi,
    R_1psi,
    R_thermal: R_thermal_corrected,
    // Datos adicionales para análisis más detallado
    mass_kg: mass,
    crater_diameter_km: estimateCraterDiameter(diameter_m, density_kgm3, speed_kms),
    seismic_magnitude: estimateSeismicMagnitude(E_effective)
  };
}

// Estimación del diámetro del cráter usando la ecuación de Melosh (1989)
function estimateCraterDiameter(diameter_m, density_kgm3, speed_kms) {
  const projectile_density = density_kgm3;
  const target_density = 2500; // kg/m³ (densidad promedio de roca)
  const gravity = 9.81; // m/s²
  const impact_velocity = speed_kms * 1000; // m/s
  
  // Diámetro del cráter según Melosh (1989) - ecuación simplificada
  const energy_scaling = Math.pow(projectile_density / target_density, 1/3);
  const velocity_scaling = Math.pow(impact_velocity / 1000, 0.78); // Factor de velocidad
  const size_scaling = Math.pow(diameter_m, 0.78);
  
  const crater_diameter_m = 1.8 * energy_scaling * velocity_scaling * size_scaling;
  return crater_diameter_m / 1000; // Convertir a km
}

// Estimación de magnitud sísmica basada en energía liberada
function estimateSeismicMagnitude(energy_joules) {
  // Relación Gutenberg-Richter modificada para impactos
  // log10(E) = 11.8 + 1.5 * M (donde E está en ergios)
  const energy_ergs = energy_joules * 1e7; // Convertir J a ergios
  const magnitude = (Math.log10(energy_ergs) - 11.8) / 1.5;
  return Math.max(0, Math.min(10, magnitude)); // Limitar entre 0 y 10
}

// Cache para discos térmicos optimizado
const heatDiskCache = new Map();

// Soft heat disk optimizado (radial gradient) as a canvas con cache
export function makeHeatDisk(size = 256, color = 'rgba(255,140,0,0.8)') {
  const cacheKey = `${size}_${color}`;
  
  // Retornar desde cache si existe
  if (heatDiskCache.has(cacheKey)) {
    return heatDiskCache.get(cacheKey);
  }
  
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  
  // Usar menos stops de gradiente para mejor rendimiento
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2
  );
  g.addColorStop(0, 'rgba(255,200,0,0.5)');
  g.addColorStop(0.5, 'rgba(255,140,0,0.3)');
  g.addColorStop(1, 'rgba(255,120,0,0)');
  
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Guardar en cache
  heatDiskCache.set(cacheKey, c);
  
  // Limpiar cache si crece mucho
  if (heatDiskCache.size > 10) {
    const firstKey = heatDiskCache.keys().next().value;
    heatDiskCache.delete(firstKey);
  }
  
  return c;
}
