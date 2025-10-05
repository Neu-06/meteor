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
  CameraEventType,
  KeyboardEventModifier,
} from 'cesium';

import { forwardGeodesic, energyAndRadius, makeHeatDisk, toRad } from './utils';

// Círculo geodésico optimizado para las zonas de daño
function circlePositions(centerLat, centerLon, radiusKm, segments = 120) {
  const arr = [];
  // Usar menos puntos para círculos pequeños
  const actualSegments = radiusKm < 2 ? Math.max(24, segments / 4) : 
                        radiusKm < 10 ? Math.max(48, segments / 2) : segments;
  
  for (let i = 0; i <= actualSegments; i++) {
    const brg = (360 * i) / actualSegments;
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

  // Limpieza muy segura de la escena
  try {
    // Suspender rendering temporalmente
    viewer.scene.requestRenderMode = true;
    
    // Detener cualquier tracking antes de limpiar
    if (viewer.trackedEntity) {
      viewer.trackedEntity = undefined;
    }
    
    // Resetear transformaciones de cámara
    try {
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    } catch (e) {
      console.warn('Error reseteando camera transform:', e);
    }
    
    // Limpiar entidades de forma individual primero
    const entities = viewer.entities.values;
    for (let i = entities.length - 1; i >= 0; i--) {
      try {
        viewer.entities.remove(entities[i]);
      } catch (removeError) {
        // Ignorar errores individuales de eliminación
      }
    }
    
    // Limpiar cualquier entidad restante
    try {
      viewer.entities.removeAll();
    } catch (e) {
      console.warn('Error en removeAll durante simulación:', e);
    }
    
    // Reactivar rendering
    viewer.scene.requestRenderMode = false;
    viewer.scene.requestRender();
    
  } catch (e) {
    console.warn('Error durante limpieza de escena:', e);
    // Fallback mínimo
    try {
      viewer.entities.removeAll();
    } catch (fallbackError) {
      console.error('Error en fallback de limpieza:', fallbackError);
    }
  }

  // Eliminamos el marcador de entrada - solo mostraremos el punto de impacto

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

  // Calcular posición exacta de impacto ANTES de crear la animación
  const impactCart = new Cartesian3(
    startCart.x + dirECEF.x * totalDistance,
    startCart.y + dirECEF.y * totalDistance,
    startCart.z + dirECEF.z * totalDistance
  );
  const impactCarto = Cartographic.fromCartesian(impactCart, ellipsoid);
  const impactLat = (impactCarto.latitude * 180) / Math.PI;
  const impactLon = (impactCarto.longitude * 180) / Math.PI;

  // PIN VISUAL - Marcar la zona exacta de impacto ANTES de la animación
  const impactPin = viewer.entities.add({
    position: Cartesian3.fromDegrees(impactLon, impactLat, 100),
    billboard: {
      // image: 'data:image/svg+xml;base64,' + btoa(`
      //   <svg width="48" height="60" xmlns="http://www.w3.org/2000/svg">
      //     <defs>
      //       <filter id="glow">
      //         <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      //         <feMerge>
      //           <feMergeNode in="coloredBlur"/>
      //           <feMergeNode in="SourceGraphic"/>
      //         </feMerge>
      //       </filter>
      //     </defs>
      //     <path d="M24 2 C12 2, 2 12, 2 24 C2 36, 24 58, 24 58 S46 36, 46 24 C46 12, 36 2, 24 2 Z" 
      //           fill="#ff0000" stroke="#ffffff" stroke-width="2" filter="url(#glow)"/>
      //     <circle cx="24" cy="24" r="8" fill="#ffffff"/>
      //     <text x="24" y="28" text-anchor="middle" fill="#ff0000" font-family="Arial" font-size="12" font-weight="bold">!</text>
      //   </svg>
      // `),
      scale: 1.2,
      verticalOrigin: 1, // BOTTOM
      horizontalOrigin: 0, // CENTER
    },
    label: {
      text: 'ZONA DE IMPACTO',
      scale: 0.9,
      fillColor: Color.WHITE,
      outlineColor: Color.RED,
      style: LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cartesian3(0, -70, 0),
      font: 'bold 14pt sans-serif',
    },
  });

  // Animación de mínimo 5 segundos para mejor visualización
  const animationDuration = Math.max(5.0, timeToImpact); // Mínimo 5 segundos, o el tiempo real si es mayor
  const dt = animationDuration / 250; // 250 pasos para animación más suave
  const steps = 250;
  const posProp = new SampledPositionProperty();
  posProp.setInterpolationOptions({
    interpolationAlgorithm: LinearApproximation,
    interpolationDegree: 1,
  });

  const start = JulianDate.now();
  const polyPositions = [];
  const sparkEntities = [];

  for (let i = 0; i <= steps; i++) {
    const tSec = i * dt; // Tiempo desde 0 hasta 4 segundos
    const progress = i / steps; // Progreso de 0 a 1
    const s = progress * totalDistance; // Recorrer toda la distancia en 4 segundos

    // Punto recto en la línea ECEF
    const cart = new Cartesian3(
      startCart.x + dirECEF.x * s,
      startCart.y + dirECEF.y * s,
      startCart.z + dirECEF.z * s
    );

    const carto = Cartographic.fromCartesian(cart, ellipsoid);
    const height = carto.height;

    posProp.addSample(JulianDate.addSeconds(start, tSec, new JulianDate()), cart);
    
    // Solo agregar cada 3er punto para reducir vértices de polyline
    if (i % 3 === 0) {
      polyPositions.push(cart);
    }

    // Chispas decorativas más espaciadas para mejor rendimiento
    if (i % 8 === 0 && height > 20000) { // Solo en alta altitud
      const age = i / steps;
      try {
        const e = viewer.entities.add({
          position: cart,
          point: {
            pixelSize: 2 + 2 * Math.random(),
            color: Color.ORANGE.withAlpha(0.4 - 0.3 * age),
          },
        });
        sparkEntities.push(e);
        // Limpiar chispas con máxima seguridad
        setTimeout(() => {
          try {
            if (!viewer.isDestroyed() && 
                viewer.entities && 
                !viewer.entities.isDestroyed && 
                viewer.entities.contains(e)) {
              viewer.entities.remove(e);
            }
          } catch (err) {
            // Ignorar todos los errores de limpieza de chispas
          }
        }, 800);
      } catch (err) {
        // Ignorar errores al crear chispas
      }
    }

    if (height <= 0 || s >= totalDistance) break;
  }

  // Asegurar que el meteorito termine exactamente en el punto de impacto calculado anteriormente
  const finalImpactTime = JulianDate.addSeconds(start, animationDuration, new JulianDate());
  posProp.addSample(finalImpactTime, Cartesian3.fromDegrees(impactLon, impactLat, 0));

  // ===== Modelo 3D del meteorito mejorado =====
  // Escala más visible y proporcional al diámetro
  const baseScale = Math.max(0.5, Math.min(8.0, diameter / 25)); // Más visible
  
  // Tamaño mínimo en píxeles más generoso para mejor visibilidad
  const minPixelSize = Math.max(24, Math.min(64, diameter / 4)); // Más visible
  
  const meteor = viewer.entities.add({
    position: posProp,
    orientation: new VelocityOrientationProperty(posProp),
    // Punto de referencia siempre visible
    point: {
      pixelSize: Math.max(8, Math.min(16, diameter / 10)),
      color: Color.fromCssColorString('#ff4500'),
      outlineColor: Color.WHITE,
      outlineWidth: 2,
      heightReference: 0, // Clamp to ground off
    },
    // Modelo 3D
    model: {
      uri: '/models/meteor_opt.glb',
      minimumPixelSize: minPixelSize,
      maximumScale: 500, // Aumentado para mejor visibilidad
      scale: baseScale,
      runAnimations: true, // Reactivar animaciones para mejor efecto visual
      color: Color.fromCssColorString('#ff6b1a'), // Color más vibrante
      colorBlendMode: ColorBlendMode.MIX,
      colorBlendAmount: 0.7, // Más blend para mejor visibilidad
      silhouetteColor: Color.ORANGE.withAlpha(0.3), // Silueta sutil para visibilidad
      silhouetteSize: 2,
    },
    // Estela mejorada para seguimiento visual
    path: {
      leadTime: 2, // Mostrar un poco adelante para anticipación
      trailTime: animationDuration, // Estela durante toda la animación (4 segundos)
      width: Math.max(3.0, Math.min(8.0, diameter / 20)), // Más ancho para visibilidad
      material: new PolylineGlowMaterialProperty({
        glowPower: 0.3, // Más glow para mejor visibilidad
        color: Color.fromCssColorString('#ff8c42').withAlpha(0.9),
      }),
      resolution: 120, // Mejor resolución para suavidad
    },
  });

  // Línea de trayectoria completa hasta el punto exacto de impacto
  // Asegurar que termine exactamente en el punto de impacto
  const completeTrajectory = [...polyPositions];
  if (completeTrajectory.length > 0) {
    // Forzar que el último punto sea exactamente el punto de impacto
    completeTrajectory[completeTrajectory.length - 1] = Cartesian3.fromDegrees(impactLon, impactLat, 0);
  }
  
  viewer.entities.add({
    polyline: {
      positions: completeTrajectory,
      width: Math.max(3.0, Math.min(6.0, diameter / 30)), // Más ancho para visibilidad
      material: new PolylineGlowMaterialProperty({
        glowPower: 0.2,
        color: Color.ORANGE.withAlpha(0.8),
      }),
      arcType: ArcType.NONE, // recta sin curvatura visual
      clampToGround: false,
    },
  });

  // ===== Visuales de impacto =====
  const { MT, KT, R_20psi, R_5psi, R_1psi, R_thermal } =
    energyAndRadius(diameter, density, speed);

  const impactPos = Cartesian3.fromDegrees(impactLon, impactLat, 10);

  // El pin de impacto ya fue creado al inicio - no duplicar

  // Disco térmico optimizado
  const heatDisk = makeHeatDisk(256, 'rgba(255,140,0,0.8)'); // Menor resolución y transparencia
  viewer.entities.add({
    position: impactPos,
    ellipse: {
      semiMajorAxis: R_thermal * 1000,
      semiMinorAxis: R_thermal * 1000,
      material: new ImageMaterialProperty({ image: heatDisk, transparent: true }),
      height: 15,
      granularity: Math.PI / 32, // Menos detalle geométrico para mejor rendimiento
    },
  });

  // Anillos de sobrepresión optimizados
  [
    { r: R_20psi, fill: '#8b0000', alpha: 0.3, outline: '#ff0000' },
    { r: R_5psi,  fill: '#ff2d2d', alpha: 0.2, outline: '#ff2d2d' },
    { r: R_1psi,  fill: '#ff9900', alpha: 0.15, outline: '#ff9900' },
  ].forEach((rg) => {
    if (rg.r > 0.1) {
      // Menos segmentos para círculos más pequeños
      const segments = rg.r < 5 ? 60 : rg.r < 20 ? 90 : 120;
      viewer.entities.add({
        polygon: {
          hierarchy: circlePositions(impactLat, impactLon, rg.r, segments),
          material: Color.fromCssColorString(rg.fill).withAlpha(rg.alpha),
          outline: true,
          outlineColor: Color.fromCssColorString(rg.outline).withAlpha(0.5),
          height: 15,
          granularity: Math.PI / 16, // Menos detalle para mejor rendimiento
        },
      });
    }
  });

  // Configuración de seguimiento automático del meteorito
  if (autoZoom) {
    // Calcular altura de cámara apropiada para seguir el meteorito desde arriba
    const followHeight = Math.max(100000, Math.min(800000, totalDistance / 3));
    
    // Configurar seguimiento inicial del meteorito
    viewer.trackedEntity = meteor;
    
    // Configurar la cámara con ángulo desde arriba para mejor seguimiento
    setTimeout(() => {
      if (!viewer.isDestroyed() && viewer.trackedEntity === meteor) {
        viewer.camera.lookAtTransform(Matrix4.IDENTITY);
        
        // Configurar vista desde arriba con ligero ángulo
        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(lon, lat, followHeight),
          orientation: {
            heading: 0.0,
            pitch: -Math.PI / 3, // 60 grados hacia abajo (vista desde arriba con ángulo)
            roll: 0.0
          }
        });
      }
    }, 500);

    // Alejar cámara automáticamente 2 segundos antes del impacto 
    const animationTimeMs = animationDuration * 1000; // Duración en ms
    const timeBeforeImpact = 2000; // 2 segundos antes del impacto
    
    setTimeout(() => {
      if (!viewer.isDestroyed()) {
        // Dejar de seguir la entidad gradualmente
        viewer.trackedEntity = undefined;
        
        // Calcular altura apropiada para mostrar toda la zona de impacto
        const maxRadius = Math.max(R_20psi, R_5psi, R_1psi, R_thermal);
        const zoomOutHeight = Math.max(100000, maxRadius * 1500);
        
        // Volar suavemente a una vista completamente desde arriba
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(impactLon, impactLat, zoomOutHeight),
          orientation: {
            heading: 0.0,
            pitch: -Math.PI / 2, // Vista cenital perfecta
            roll: 0.0
          },
          duration: 2.0, // 2 segundos de transición suave
          complete: () => {
            console.log(`Cámara posicionada a ${(zoomOutHeight/1000).toFixed(1)}km para observar el impacto desde arriba`);
          }
        });
      }
    }, animationTimeMs - timeBeforeImpact); // 3 segundos después del inicio
  }
  
  // Configurar seguimiento manual de la trayectoria
  try {
    // Configurar controles de cámara para mejor experiencia de zoom
    const scene = viewer.scene;
    const camera = viewer.camera;
    const controller = scene.screenSpaceCameraController;
    
    // Permitir controles completos de cámara
    controller.enableRotate = true;
    controller.enableTranslate = true;
    controller.enableZoom = true;
    controller.enableTilt = true;
    controller.enableLook = true;
    
    // Configurar límites de zoom más naturales
    controller.minimumZoomDistance = 100; // Muy cerca para detalles
    controller.maximumZoomDistance = 100000000; // Muy lejos para contexto global
    
    // Configurar inercia y sensibilidad para movimientos más suaves
    controller.translateEventTypes = [
      CameraEventType.LEFT_DRAG,
      CameraEventType.PINCH
    ];
    controller.zoomEventTypes = [
      CameraEventType.WHEEL,
      CameraEventType.PINCH
    ];
    
    // Configurar velocidades de movimiento más suaves
    controller.rotateEventTypes = CameraEventType.LEFT_DRAG;
    controller.tiltEventTypes = [
      CameraEventType.MIDDLE_DRAG,
      CameraEventType.PINCH,
      {
        eventType: CameraEventType.LEFT_DRAG,
        modifier: KeyboardEventModifier.CTRL
      }
    ];
    
    // Configurar inercia para movimientos más naturales
    controller.inertiaSpin = 0.9;
    controller.inertiaTranslate = 0.9;
    controller.inertiaZoom = 0.8;
    
  } catch (e) {
    console.warn('Error configurando controles de cámara:', e);
  }

  // Callback con datos de impacto completos
  if (onImpactCalculated) {
    const impactResults = energyAndRadius(diameter, density, speed);
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
      // Nuevos datos del modelo mejorado
      crater_diameter_km: impactResults.crater_diameter_km,
      seismic_magnitude: impactResults.seismic_magnitude,
      efficiency: impactResults.efficiency,
      mass_kg: impactResults.mass_kg,
      E_effective_J: impactResults.E_effective_J,
    });
  }
}
