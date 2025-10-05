'use client';
import { useState } from 'react';

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

  const { containerRef, viewerRef, resetCrosshair } = useCesiumViewer(params, setParams);

  function handleSelectNeo(neo) {
    setSelectedNeo(neo);
    setParams((p) => ({
      ...p,
      diameter: neo.diameter,
      speed: neo.speed,
      density: neo.density,
    }));
  }

  function onSimulate() {
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
  }

  function onReset() {
    const v = viewerRef.current;
    if (!v) return;
    v.entities.removeAll();
    resetCrosshair(params.lat, params.lon);
    v.camera.flyHome(1.0);
    setSelectedNeo(null);
    setImpactData(null);
    setShowAnalysisPanel(false);
    setImpactInfo(null);
  }

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
