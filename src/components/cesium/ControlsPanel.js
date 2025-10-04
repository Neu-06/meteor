'use client';
export default function ControlsPanel({ params, setParams, onSimulate, onReset }) {
  return (
    <div className="glass ui-panel">
      <div className="title">Simulación de meteorito</div>

      <div className="grid2">
        <label>
          Lat
          <input
            type="number"
            step="0.01"
            value={params.lat}
            onChange={(e) => setParams((p) => ({ ...p, lat: Number(e.target.value) }))}
          />
        </label>
        <label>
          Lon
          <input
            type="number"
            step="0.01"
            value={params.lon}
            onChange={(e) => setParams((p) => ({ ...p, lon: Number(e.target.value) }))}
          />
        </label>

        <label>
          Rumbo (°)
          <input
            type="range"
            min="0"
            max="359"
            value={params.heading}
            onChange={(e) => setParams((p) => ({ ...p, heading: Number(e.target.value) }))}
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
            onChange={(e) => setParams((p) => ({ ...p, angle: Number(e.target.value) }))}
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
            onChange={(e) => setParams((p) => ({ ...p, speed: Number(e.target.value) }))}
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
            onChange={(e) => setParams((p) => ({ ...p, diameter: Number(e.target.value) }))}
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
            onChange={(e) => setParams((p) => ({ ...p, density: Number(e.target.value) }))}
          />
          <span className="val">{params.density}</span>
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={params.autoZoom}
            onChange={(e) => setParams((p) => ({ ...p, autoZoom: e.target.checked }))}
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
      <div className="tip">Tip: haz click en el mapa para fijar Lat/Lon de entrada.</div>
    </div>
  );
}
