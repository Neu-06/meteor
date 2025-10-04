'use client';
import {
  Cartesian3,
  JulianDate,
  PolylineGlowMaterialProperty,
  SampledPositionProperty,
  Color,
  LabelStyle,
  NearFarScalar,
  ImageMaterialProperty,
} from 'cesium';
import { forwardGeodesic, energyAndRadius, makeHeatDisk, toRad } from './utils';

// Build circle polygon positions using forward geodesic
function circlePositions(centerLat, centerLon, radiusKm, segments = 180) {
  const arr = [];
  for (let i = 0; i <= segments; i++) {
    const brg = (360 * i) / segments;
    const dest = forwardGeodesic(centerLat, centerLon, brg, radiusKm * 1000);
    arr.push(Cartesian3.fromDegrees(dest.lon, dest.lat, 20));
  }
  return arr;
}

export function runSimulation(viewer, params, selectedNeo = null) {
  if (!viewer) return;
  const { lat, lon, heading, angle, speed, diameter, density, autoZoom } = params;

  viewer.entities.removeAll();

  // Re-add crosshair for visual reference
  const crosshair = viewer.entities.add({
    position: Cartesian3.fromDegrees(lon, lat),
    point: {
      pixelSize: 10,
      color: Color.CYAN,
      outlineColor: Color.WHITE,
      outlineWidth: 2,
    },
    label: {
      text: 'Entrada',
      scale: 0.6,
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian3(0, -18, 0),
    },
  });

  const startAlt = 100000; // 100 km
  const v_ms = speed * 1000;
  const angleRad = toRad(angle);
  const groundSpeed = v_ms * Math.cos(angleRad);
  const descentRate = Math.max(1, v_ms * Math.sin(angleRad));
  const timeToImpact = Math.ceil(startAlt / descentRate);

  const dt = 0.5;
  const steps = Math.min(4000, Math.ceil(timeToImpact / dt));
  const posProp = new SampledPositionProperty();
  const start = JulianDate.now();
  let t = 0,
    curLat = lat,
    curLon = lon,
    curAlt = startAlt;
  const polyPositions = [];

  const sparkEntities = [];

  for (let i = 0; i <= steps; i++) {
    const dist = groundSpeed * dt;
    const moved = forwardGeodesic(curLat, curLon, heading, dist);
    curLat = moved.lat;
    curLon = moved.lon;
    curAlt = Math.max(0, startAlt - descentRate * (t + dt));

    const cart = Cartesian3.fromDegrees(curLon, curLat, curAlt);
    posProp.addSample(JulianDate.addSeconds(start, t, new JulianDate()), cart);
    polyPositions.push(cart);

    // small sparks trail
    if (i % 3 === 0) {
      const age = i / steps;
      const e = viewer.entities.add({
        position: cart,
        point: {
          pixelSize: 3 + 3 * Math.random(),
          color: Color.ORANGE.withAlpha(0.6 - 0.5 * age),
        },
      });
      sparkEntities.push(e);
      setTimeout(() => viewer.entities.remove(e), 1500);
    }

    t += dt;
    if (curAlt <= 0) break;
  }

  // animated meteor
  const meteor = viewer.entities.add({
    position: posProp,
    point: {
      pixelSize: 12,
      color: Color.fromCssColorString('#ff7b00'),
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      translucencyByDistance: new NearFarScalar(1e2, 1.0, 1e7, 0.2),
    },
    path: {
      leadTime: 0,
      trailTime: Math.min(60, timeToImpact),
      width: 3.0,
      material: new PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Color.fromCssColorString('#ffd000').withAlpha(0.85),
      }),
    },
  });

  // full polyline
  viewer.entities.add({
    polyline: { positions: polyPositions, width: 2, material: Color.YELLOW.withAlpha(0.8) },
  });

  // impact visuals: energy, rings, label
  const { MT, R_km } = energyAndRadius(diameter, density, speed);
  const impactPos = Cartesian3.fromDegrees(curLon, curLat, 10);

  // heat disk
  const heatDisk = makeHeatDisk(512, 'rgba(255,140,0,1)');
  viewer.entities.add({
    position: impactPos,
    ellipse: {
      semiMajorAxis: R_km * 600,
      semiMinorAxis: R_km * 600,
      material: new ImageMaterialProperty({ image: heatDisk, transparent: true }),
      height: 15,
    },
  });

  // damage rings
  const rings = [
    { r: Math.max(5, R_km * 0.5), fill: '#ff2d2d', alpha: 0.28, outline: '#ff2d2d' },
    { r: Math.max(10, R_km * 1.0), fill: '#ff9900', alpha: 0.22, outline: '#ff9900' },
    { r: Math.max(20, R_km * 1.6), fill: '#ffd54a', alpha: 0.18, outline: '#ffd54a' },
  ];
  rings.forEach((rg) => {
    viewer.entities.add({
      polygon: {
        hierarchy: circlePositions(curLat, curLon, rg.r),
        material: Color.fromCssColorString(rg.fill).withAlpha(rg.alpha),
        outline: true,
        outlineColor: Color.fromCssColorString(rg.outline).withAlpha(0.65),
        height: 15,
      },
    });
  });

  // label
  const labelText = selectedNeo
    ? `${selectedNeo.name}\nImpacto: ${curLat.toFixed(2)}, ${curLon.toFixed(2)}\nE≈${MT.toFixed(2)} Mt\nØ ${diameter.toFixed(0)}m, ${speed.toFixed(1)} km/s`
    : `Impacto\n${curLat.toFixed(2)}, ${curLon.toFixed(2)}\nE≈${MT.toFixed(2)} Mt`;

  viewer.entities.add({
    position: impactPos,
    label: {
      text: labelText,
      scale: 0.7,
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian3(0, -28, 0),
    },
  });

  if (autoZoom) {
    viewer.flyTo(viewer.entities, { duration: 1.2, maximumHeight: 2_000_000 });
  }
  viewer.trackedEntity = meteor;
}
