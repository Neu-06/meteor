"use client";

import { useState } from "react";
import NeoList from "./NeoList";


export default function ControlsPanel({
  params,
  setParams,
  onSimulate,
  onReset,
  selectedNeo,
  onSelectNeo,
}) {
  const [open, setOpen] = useState(true);
  const [isLoadingNeos, setIsLoadingNeos] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'sim' | 'list'

  function handleSelectNeo(neo) {
    if (onSelectNeo) onSelectNeo(neo);
  }

  function handleMenu(option) {
    setPanel(option);
  }

  return (
    <div className="relative">
      {/* Botón para abrir/cerrar el panel */}
      <button
        className="absolute top-2 left-2 z-30 bg-blue-950 dark:bg-blue-950 rounded-full p-2 shadow-lg"
        onClick={() => {
          if (!open) {
            setOpen(true);
            setPanel(null); // Al abrir, mostrar menú
          } else {
            setOpen(false);
          }
        }}
        aria-label={open ? "Cerrar panel" : "Abrir panel"}
        style={{ minWidth: 36, minHeight: 36 }}
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <>
          {/* Menú de opciones al abrir */}
          {panel === null && (
            <div className="glass ui-panel flex flex-col items-center py-8 gap-4">
              <div className="font-bold text-lg mb-2">¿Qué deseas ver?</div>
              <button className="btn w-full" onClick={() => handleMenu('sim')}>
                Simulación de meteorito
              </button>
              <button className="btn w-full" onClick={() => handleMenu('list')}>
                Lista de meteoritos
              </button>
            </div>
          )}

          {/* Panel de simulación */}
          {panel === 'sim' && (
            <div className="glass ui-panel">
              <div className="title text-center">
                Simulación de meteorito
                {selectedNeo && (
                  <div className="neo-badge mt-2">🌠 {selectedNeo.name}</div>
                )}
              </div>

              <div className="grid2">
                <label>
                  Lat
                  <input
                    type="number"
                    step="0.01"
                    value={params.lat}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, lat: Number(e.target.value) }))
                    }
                  />
                </label>
                <label>
                  Lon
                  <input
                    type="number"
                    step="0.01"
                    value={params.lon}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, lon: Number(e.target.value) }))
                    }
                  />
                </label>
                <label>
                  Rumbo (°)
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={params.heading}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        heading: Number(e.target.value),
                      }))
                    }
                  />
                  <span className="val">{params.heading}°</span>
                </label>
                <label>
                  Ángulo (°)
                  <input
                    type="range"
                    min="5"
                    max="85"
                    value={params.angle}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, angle: Number(e.target.value) }))
                    }
                  />
                  <span className="val">{params.angle}°</span>
                </label>
                <label>
                  Velocidad (km/s)
                  <input
                    type="range"
                    min="11"
                    max="72"
                    step="0.5"
                    value={params.speed}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, speed: Number(e.target.value) }))
                    }
                    disabled={!!selectedNeo}
                  />
                  <span className="val">{params.speed.toFixed(1)}</span>
                </label>
                <label>
                  Diámetro (m)
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    value={params.diameter}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        diameter: Number(e.target.value),
                      }))
                    }
                    disabled={!!selectedNeo}
                  />
                  <span className="val">{params.diameter}</span>
                </label>
                <label>
                  Densidad (kg/m³)
                  <input
                    type="range"
                    min="500"
                    max="8000"
                    step="100"
                    value={params.density}
                    onChange={(e) =>
                      setParams((p) => ({
                        ...p,
                        density: Number(e.target.value),
                      }))
                    }
                    disabled={!!selectedNeo}
                  />
                  <span className="val">{params.density}</span>
                </label>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={params.autoZoom}
                    onChange={(e) =>
                      setParams((p) => ({ ...p, autoZoom: e.target.checked }))
                    }
                  />
                  <span>Auto-zoom</span>
                </label>
              </div>

              <div className="row">
                <button className="btn primary" onClick={onSimulate}>
                  Simular impacto
                </button>
                <button className="btn" onClick={onReset}>
                  Reset
                </button>
              </div>

              <div className="legend">
                <div className="dot dot-red" /> daño severo
                <div className="dot dot-orange" /> alto
                <div className="dot dot-yellow" /> moderado
              </div>
              <div className="tip">
                {selectedNeo
                  ? `Usando datos de NASA para ${selectedNeo.name}`
                  : "Tip: haz click en el mapa para fijar Lat/Lon de entrada."}
              </div>
              <button className="btn mt-2 w-full" onClick={() => setPanel(null)}>
                ← Volver al menú
              </button>
            </div>
          )}

          {/* Panel de lista de meteoritos */}
          {panel === 'list' && (
            <div className="glass ui-panel flex flex-col items-center py-8 gap-4">
              <div className="font-bold text-lg mb-2">Lista de meteoritos</div>
              <div className="w-full">
                <NeoList
                  onSelectNeo={handleSelectNeo}
                  isLoading={isLoadingNeos}
                  setIsLoading={setIsLoadingNeos}
                />
              </div>
              <button className="btn mt-2 w-full" onClick={() => setPanel(null)}>
                ← Volver al menú
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
