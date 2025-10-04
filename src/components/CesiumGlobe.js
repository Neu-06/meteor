'use client';
import { useState } from 'react';
import ControlsPanel from './cesium/ControlsPanel';
import { useCesiumViewer } from './cesium/useCesiumViewer';
import { runSimulation } from './cesium/runSimulation';

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
    runSimulation(viewer, params, selectedNeo);
  }

  function onReset() {
    const v = viewerRef.current;
    if (!v) return;
    v.entities.removeAll();
    resetCrosshair(params.lat, params.lon);
    v.camera.flyHome(1.0);
    setSelectedNeo(null);
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
      />
    </>
  );
}
