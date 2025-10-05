'use client';
import { useState, useCallback } from 'react';
import { Matrix4 } from 'cesium';

import ControlsPanel from './cesium/ControlsPanel';
import ImpactAnalysisPanel from './cesium/ImpactAnalysisPanel';
import { useCesiumViewer } from './cesium/useCesiumViewer';
import { runSimulation } from './cesium/runSimulation';
import ImpactInfoBox from './cesium/ImpactInfoBox';


export default function CesiumGlobe() {
  const [params, setParams] = useState({
    lat: -16.5,
    lon: -68.15, // La Paz por defecto
    heading: 80, // rumbo°
    angle: 25, // entrada°
    speed: 18, // km/s
    diameter: 120, // m
    density: 3000, // kg/m3
    autoZoom: true,
  });

  const [selectedNeo, setSelectedNeo] = useState(null);
  const [isLoadingNeos, setIsLoadingNeos] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [impactInfo, setImpactInfo] = useState(null); // {lat, lon, energyMt, diameter, speed, selectedNeo}

  // Usar useCallback para setParams para evitar re-renders innecesarios
  const memoizedSetParams = useCallback((updater) => {
    setParams(updater);
  }, []);

  const { containerRef, viewerRef, resetCrosshair } = useCesiumViewer(params, memoizedSetParams);

  const handleSelectNeo = useCallback((neo) => {
    setSelectedNeo(neo);
    setParams((p) => ({
      ...p,
      diameter: neo.diameter,
      speed: neo.speed,
      density: neo.density,
    }));
  }, []);

  const onSimulate = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    runSimulation(viewer, params, selectedNeo, (data) => {
      setImpactData(data);
      setShowAnalysisPanel(true);
      // Calcular info de impacto para ImpactInfoBox
      const { lat, lon, heading, angle, speed, diameter, density } = params;
      const startAlt = 100000;
      const v_ms = speed * 1000;
      const angleRad = (angle * Math.PI) / 180;
      const groundSpeed = v_ms * Math.cos(angleRad);
      const descentRate = Math.max(1, v_ms * Math.sin(angleRad));
      const timeToImpact = Math.ceil(startAlt / descentRate);
      const dt = 0.5;
      const steps = Math.min(4000, Math.ceil(timeToImpact / dt));
      let t = 0,
        curLat = lat,
        curLon = lon,
        curAlt = startAlt;
      for (let i = 0; i <= steps; i++) {
        const dist = groundSpeed * dt;
        const moved = require('./cesium/utils').forwardGeodesic(curLat, curLon, heading, dist);
        curLat = moved.lat;
        curLon = moved.lon;
        curAlt = Math.max(0, startAlt - descentRate * (t + dt));
        t += dt;
        if (curAlt <= 0) break;
      }
      const { energyAndRadius } = require('./cesium/utils');
      const { MT } = energyAndRadius(diameter, density, speed);
      setImpactInfo({
        lat: curLat,
        lon: curLon,
        energyMt: MT,
        diameter,
        speed,
        selectedNeo,
      });
    });
  }, [params, selectedNeo, viewerRef]);

  const onReset = useCallback(() => {
    const v = viewerRef.current;
    if (!v || v.isDestroyed()) return;
    
    try {
      // Paso 1: Detener animaciones y tracking de forma segura
      v.clock.shouldAnimate = false;
      
      // Paso 2: Detener tracking entity de forma segura
      if (v.trackedEntity) {
        v.trackedEntity = undefined;
      }
      
      // Paso 3: Resetear transformaciones de cámara
      try {
        v.camera.lookAtTransform(Matrix4.IDENTITY);
      } catch (e) {
        console.warn('Error reseteando transform de cámara:', e);
      }
      
      // Paso 4: Limpiar entidades con delay para evitar conflictos de render
      setTimeout(() => {
        try {
          if (!v.isDestroyed()) {
            // Suspender rendering temporalmente
            v.scene.requestRenderMode = true;
            
            // Limpiar entidades de forma individual y segura
            const entities = v.entities.values;
            for (let i = entities.length - 1; i >= 0; i--) {
              try {
                v.entities.remove(entities[i]);
              } catch (removeError) {
                // Ignorar errores individuales
              }
            }
            
            // Limpiar cualquier entidad restante
            try {
              v.entities.removeAll();
            } catch (e) {
              console.warn('Error en removeAll:', e);
            }
            
            // Reactivar rendering
            v.scene.requestRenderMode = false;
            v.scene.requestRender();
          }
        } catch (e) {
          console.warn('Error en limpieza diferida:', e);
        }
      }, 100);
      
      // Paso 5: Resetear controles de cámara
      try {
        const controller = v.scene.screenSpaceCameraController;
        controller.enableRotate = true;
        controller.enableTranslate = true;
        controller.enableZoom = true;
        controller.enableTilt = true;
        controller.enableLook = true;
      } catch (e) {
        console.warn('Error reseteando controles:', e);
      }
      
      // Paso 6: Resetear vista y posición con delay
      setTimeout(() => {
        try {
          if (!v.isDestroyed()) {
            // Reactivar animación del reloj
            v.clock.shouldAnimate = true;
            
            // Resetear crosshair
            resetCrosshair(params.lat, params.lon);
            
            // Volver a la vista inicial
            v.camera.flyHome(2.0);
          }
        } catch (e) {
          console.warn('Error en reset de vista:', e);
        }
      }, 200);
      
      // Paso 7: Limpiar estados del componente inmediatamente
      setSelectedNeo(null);
      setImpactData(null);
      setShowAnalysisPanel(false);
      setImpactInfo(null);
      
    } catch (e) {
      console.warn('Error durante reset principal:', e);
      
      // Fallback más simple y seguro
      setTimeout(() => {
        try {
          if (!v.isDestroyed()) {
            v.trackedEntity = undefined;
            v.entities.removeAll();
            v.camera.flyHome(1.0);
            resetCrosshair(params.lat, params.lon);
          }
        } catch (fallbackError) {
          console.error('Error en reset de emergencia:', fallbackError);
        }
      }, 300);
    }
  }, [params, resetCrosshair, viewerRef]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0 }}
      />
      <ControlsPanel
        params={params}
        setParams={setParams}
        onSimulate={onSimulate}
        onReset={onReset}
        selectedNeo={selectedNeo}
        onSelectNeo={handleSelectNeo}
      />
      {showAnalysisPanel && (
        <ImpactAnalysisPanel
          impactData={impactData}
          onClose={() => setShowAnalysisPanel(false)}
        />
      )}
      {/* {impactInfo && (
        <ImpactInfoBox
          lat={impactInfo.lat}
          lon={impactInfo.lon}
          energyMt={impactInfo.energyMt}
          diameter={impactInfo.diameter}
          speed={impactInfo.speed}
          selectedNeo={impactInfo.selectedNeo}
        />
      )} */}
    </>
  );
}
