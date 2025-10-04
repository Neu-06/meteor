'use client';
import { useState, useEffect } from 'react';
import { getUpcomingNeos } from '@/lib/neo';

export default function NeoList({ onSelectNeo, isLoading, setIsLoading }) {
  const [neos, setNeos] = useState([]);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  useEffect(() => {
    loadNeos();
  }, []);

  async function loadNeos() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUpcomingNeos();
      setNeos(data);
    } catch (err) {
      setError('Error al cargar NEOs de la NASA');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelect(neo) {
    setSelectedId(neo.id);
    onSelectNeo(neo);
  }

  if (isLoading) {
    return (
      <div className="neo-list">
        <div className="neo-header">
          <div className="neo-title">🌠 Meteoritos Cercanos (NASA)</div>
        </div>
        <div className="neo-loading">Cargando datos de NASA...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neo-list">
        <div className="neo-header">
          <div className="neo-title">🌠 Meteoritos Cercanos (NASA)</div>
        </div>
        <div className="neo-error">
          {error}
          <button className="btn-reload" onClick={loadNeos}>Reintentar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="neo-list">
      <div className="neo-header">
        <div className="neo-title">🌠 Meteoritos Cercanos (NASA)</div>
        <button className="btn-reload" onClick={loadNeos} title="Recargar">↻</button>
      </div>

      <div className="neo-scroll">
        {neos.length === 0 ? (
          <div className="neo-empty">No hay NEOs disponibles</div>
        ) : (
          neos.map((neo) => (
            <div
              key={neo.id}
              className={`neo-item ${selectedId === neo.id ? 'selected' : ''}`}
              onClick={() => handleSelect(neo)}
            >
              <div className="neo-name">
                {neo.name}
                {neo.isPotentiallyHazardous && <span className="neo-hazard" title="Potencialmente peligroso">⚠️</span>}
              </div>
              <div className="neo-stats">
                <span>Ø {neo.diameter.toFixed(0)}m</span>
                <span>{neo.speed.toFixed(1)} km/s</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="neo-info">
        {neos.length > 0 && (
          <small>Mostrando {neos.length} NEOs de los próximos 7 días</small>
        )}
      </div>
    </div>
  );
}
