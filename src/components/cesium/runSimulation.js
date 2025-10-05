'use client';
import {
  Cartesian3,
  Cartographic,
  JulianDate,
  PolylineGlowMaterialProperty,
  SampledPositionProperty,
  Color,
  LabelStyle,
  ImageMaterialProperty,
  VelocityOrientationProperty,
  LinearApproximation,   // Interpolación lineal entre samples
  ColorBlendMode,        // Color del modelo
  ArcType,               // Polilínea recta
  Ellipsoid,
  Matrix4,
  Ray,
  Transforms,
  IntersectionTests,
} from 'cesium';

import { forwardGeodesic, energyAndRadius, makeHeatDisk, toRad } from './utils';

// Círculo geodésico para las zonas de daño
function circlePositions(centerLat, centerLon, radiusKm, segments = 180) {
  const arr = [];
  for (let i = 0; i <= segments; i++) {
    const brg = (360 * i) / segments;
    const dest = forwardGeodesic(centerLat, centerLon, brg, radiusKm * 1000);
    arr.push(Cartesian3.fromDegrees(dest.lon, dest.lat, 20));
  }
  return arr;
}

export function runSimulation(
  viewer,
  params,
  selectedNeo = null,
  onImpactCalculated = null
) {
  if (!viewer) return;
  const { lat, lon, heading, angle, speed, diameter, density, autoZoom } = params;

  // Limpia escena
  viewer.entities.removeAll();

  // Cruz de referencia
  viewer.entities.add({
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

  // ===== Cinemática recta en ECEF =====
  const startAlt = 100000; // 100 km
  const v_ms = speed * 1000;
  const angleRad = toRad(angle);
  const headingRad = toRad(heading);

  // Dirección en ENU (East, North, Up). Pitch negativo hacia abajo
  const cosPitch = Math.cos(-angleRad);
  const sinPitch = Math.sin(-angleRad);
  const dirENU = new Cartesian3(
    Math.sin(headingRad) * cosPitch,  // East
    Math.cos(headingRad) * cosPitch,  // North
    sinPitch                          // Up (negativo baja)
  );

  // Marco ENU en el punto de entrada (con altitud inicial)
  const startCart = Cartesian3.fromDegrees(lon, lat, startAlt);
  const enuFrame = Transforms.eastNorthUpToFixedFrame(startCart);

  // Dirección en ECEF normalizada
  const dirECEF = Matrix4.multiplyByPointAsVector(enuFrame, dirENU, new Cartesian3());
  Cartesian3.normalize(dirECEF, dirECEF);

  // Rayo recto
  const ray = new Ray(startCart, dirECEF);
  const ellipsoid = Ellipsoid.WGS84;

  // Intersección con elipsoide (suelo)
  // IntersectionTests.rayEllipsoid devuelve distancia (en metros) o {start, stop}
  const hit = IntersectionTests.rayEllipsoid(ray, ellipsoid) ;

  let totalDistance;
  if (hit && typeof hit === 'object' && 'start' in hit) {
    // Tomamos el primer cruce con el elipsoide
    totalDistance = Math.max(0, hit.start);
  } else if (typeof hit === 'number') {
    totalDistance = Math.max(0, hit);
  } else {
    // Fallback por si no intersecta (p. ej. ángulo demasiado ascendente)
    totalDistance = 1_000_000.0; // 1000 km
  }

  const timeToImpact = totalDistance / v_ms;

  // Muestreo
  const dt = 0.5;
  const steps = Math.min(4000, Math.ceil(timeToImpact / dt));
  const posProp = new SampledPositionProperty();
  posProp.setInterpolationOptions({
    interpolationAlgorithm: LinearApproximation,
    interpolationDegree: 1,
  });

  const start = JulianDate.now();
  const polyPositions = [];
  const sparkEntities = [];

  for (let i = 0; i <= steps; i++) {
    const tSec = i * dt;
    const s = Math.min(v_ms * tSec, totalDistance);

    // Punto recto en la línea ECEF
    const cart = new Cartesian3(
      startCart.x + dirECEF.x * s,
      startCart.y + dirECEF.y * s,
      startCart.z + dirECEF.z * s
    );

    const carto = Cartographic.fromCartesian(cart, ellipsoid);
    const height = carto.height;

    posProp.addSample(JulianDate.addSeconds(start, tSec, new JulianDate()), cart);
    polyPositions.push(cart);

    // Chispas decorativas
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

    if (height <= 0 || s >= totalDistance) break;
  }

  // Posición de impacto (último punto o extremo del ray)
  const impactCart =
    polyPositions.length > 0
      ? polyPositions[polyPositions.length - 1]
      : new Cartesian3(
          startCart.x + dirECEF.x * totalDistance,
          startCart.y + dirECEF.y * totalDistance,
          startCart.z + dirECEF.z * totalDistance
        );

  const impactCarto = Cartographic.fromCartesian(impactCart, ellipsoid);
  const impactLat = (impactCarto.latitude * 180) / Math.PI;
  const impactLon = (impactCarto.longitude * 180) / Math.PI;

  // ===== Modelo 3D del meteorito =====
  const meteor = viewer.entities.add({
    position: posProp,
    orientation: new VelocityOrientationProperty(posProp),
    model: {
      uri: '/models/meteor_opt.glb',
      minimumPixelSize: 32,
      maximumScale: 200,
      scale: 1.0,
      runAnimations: true,
      color: Color.fromCssColorString('#ffae42'),
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.6,
    },
    // Estela visible y recta
    path: {
      leadTime: 0,
      trailTime: Math.min(60, timeToImpact),
      width: 3.0,
      material: new PolylineGlowMaterialProperty({
        glowPower: 0.25,
        color: Color.fromCssColorString('#ffcf40').withAlpha(0.9),
      }),
    },
  });

  // Línea completa (trayectoria recta)
  viewer.entities.add({
    polyline: {
      positions: polyPositions,
      width: 2,
      material: Color.ORANGE.withAlpha(0.9),
      arcType: ArcType.NONE, // recta sin curvatura visual
    },
  });

  // ===== Visuales de impacto =====
  const { MT, KT, R_20psi, R_5psi, R_1psi, R_thermal } =
    energyAndRadius(diameter, density, speed);

  const impactPos = Cartesian3.fromDegrees(impactLon, impactLat, 10);

  // Disco térmico
  const heatDisk = makeHeatDisk(512, 'rgba(255,140,0,1)');
  viewer.entities.add({
    position: impactPos,
    ellipse: {
      semiMajorAxis: R_thermal * 1000,
      semiMinorAxis: R_thermal * 1000,
      material: new ImageMaterialProperty({ image: heatDisk, transparent: true }),
      height: 15,
    },
  });

  // Anillos de sobrepresión
  [
    { r: R_20psi, fill: '#8b0000', alpha: 0.35, outline: '#ff0000' },
    { r: R_5psi,  fill: '#ff2d2d', alpha: 0.25, outline: '#ff2d2d' },
    { r: R_1psi,  fill: '#ff9900', alpha: 0.18, outline: '#ff9900' },
  ].forEach((rg) => {
    if (rg.r > 0.1) {
      viewer.entities.add({
        polygon: {
          hierarchy: circlePositions(impactLat, impactLon, rg.r),
          material: Color.fromCssColorString(rg.fill).withAlpha(rg.alpha),
          outline: true,
          outlineColor: Color.fromCssColorString(rg.outline).withAlpha(0.65),
          height: 15,
        },
      });
    }
  });

  if (autoZoom) {
    viewer.flyTo(viewer.entities, { duration: 1.2, maximumHeight: 2_000_000 });
  }

  viewer.trackedEntity = meteor;

  // Callback con datos de impacto
  if (onImpactCalculated) {
    onImpactCalculated({
      lat: impactLat,
      lon: impactLon,
      R_20psi,
      R_5psi,
      R_1psi,
      R_thermal,
      MT,
      KT,
      diameter,
      speed,
      density,
      neoName: selectedNeo?.name,
    });
  }
}
