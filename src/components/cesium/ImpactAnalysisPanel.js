'use client';
import { useState } from 'react';
import { analyzeImpactWithGemini } from '@/lib/gemini';

export default function ImpactAnalysisPanel({ impactData, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' or 'dashboard'
  const [open, setOpen] = useState(true);

  async function handleAnalyze() {
    if (!impactData) return;

    setLoading(true);
    setError(null);
    try {
      const result = await analyzeImpactWithGemini(impactData);
      setAnalysis(result);
    } catch (err) {
      setError('Error al analizar el impacto. Verifica tu API key de Gemini.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!impactData) {
    return (
      <div className="impact-analysis-panel">
        <div className="panel-header">
          <h3>📊 Análisis de Impacto con IA</h3>
          <button onClick={onClose} className="btn-close">✕</button>
        </div>
        <div className="panel-body">
          <p className="text-center text-gray-400">
            Ejecuta una simulación para analizar el impacto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mt-10">
      {/* Botón para abrir/cerrar el panel */}
      <button
        className="absolute top-0 right-0 z-30 bg-blue-950 dark:bg-blue-950 rounded-full p-2 shadow-lg"
        onClick={() => setOpen(!open)}
        aria-label={open ? "Cerrar panel" : "Abrir panel"}
        style={{ minWidth: 36, minHeight: 36 }}
      >
        {open ? "✕" : "📊"}
      </button>

      {open && (
        <div className="impact-analysis-panel mt-8">
          <div className="panel-header">
            <h3>📊 Análisis de Impacto con IA</h3>
          </div>

          <div className="panel-body">
            {/* Impact Summary Card */}
            <div className="impact-summary-card">
              <h4>{impactData.neoName || 'Meteorito Simulado'}</h4>
              {analysis?.location && (
                <div className="location-info">
                  📍 {analysis.location.city}, {analysis.location.region}, {analysis.location.country}
                </div>
              )}
              <div className="impact-stats-grid">
                <div className="stat">
                  <span className="stat-label">Coordenadas</span>
                  <span className="stat-value">{impactData.lat.toFixed(4)}°, {impactData.lon.toFixed(4)}°</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Energía</span>
                  <span className="stat-value">{impactData.MT.toFixed(2)} Mt</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Destrucción total</span>
                  <span className="stat-value">{impactData.R_20psi.toFixed(2)} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Daño severo</span>
                  <span className="stat-value">{impactData.R_5psi.toFixed(2)} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Rotura ventanas</span>
                  <span className="stat-value">{impactData.R_1psi.toFixed(2)} km</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Radio térmico</span>
                  <span className="stat-value">{impactData.R_thermal.toFixed(2)} km</span>
                </div>
              </div>
            </div>

            {/* Analyze Button */}
            {!analysis && !loading && (
              <button onClick={handleAnalyze} className="btn primary w-full">
                🤖 Analizar Impacto con IA
              </button>
            )}

            {/* Loading State */}
            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Analizando impacto con Gemini AI...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={handleAnalyze} className="btn-reload">Reintentar</button>
              </div>
            )}

            {/* Analysis Results */}
            {analysis && !loading && (
              <>
                {/* View Mode Toggle */}
                <div className="view-toggle">
                  <button
                    className={`toggle-btn ${viewMode === 'summary' ? 'active' : ''}`}
                    onClick={() => setViewMode('summary')}
                  >
                    📝 Resumen
                  </button>
                  <button
                    className={`toggle-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setViewMode('dashboard')}
                  >
                    📈 Dashboard
                  </button>
                </div>

                {/* Summary View */}
                {viewMode === 'summary' && (
                  <div className="summary-view">
                    <div className="summary-section">
                      <h4>📋 Resumen Ejecutivo</h4>
                      <p className="summary-text">{analysis.summary}</p>
                    </div>

                    {/* Affected Countries */}
                    {analysis.affectedCountries && analysis.affectedCountries.length > 0 && (
                      <div className="summary-section">
                        <h4>🌍 Países y Ciudades Afectadas</h4>
                        {analysis.affectedCountries.map((country, idx) => (
                          <div key={idx} className="country-card">
                            <div className="country-header">
                              <span className="country-name">{country.name}</span>
                              <span className="country-percentage">
                                {country.affectedArea ? `${country.affectedArea} km²` : `${country.percentageAffected}%`}
                              </span>
                            </div>
                            <div className="progress-bar">
                              <div
                                className="progress-fill"
                                style={{ width: `${Math.min(country.percentageAffected || 0, 100)}%` }}
                              />
                            </div>
                            {country.majorCitiesAffected && country.majorCitiesAffected.length > 0 && (
                              <div className="cities-list">
                                {country.majorCitiesAffected.map((city, cityIdx) => (
                                  <div key={cityIdx} className="city-item">
                                    {typeof city === 'string' ? (
                                      <span>{city}</span>
                                    ) : (
                                      <>
                                        <span className="city-name">{city.name}</span>
                                        {city.distance && (
                                          <span className="city-distance">{city.distance} km</span>
                                        )}
                                        {city.population && (
                                          <span className="city-pop">👥 {city.population.toLocaleString()}</span>
                                        )}
                                        {city.damageLevel && (
                                          <span className={`damage-badge damage-${city.damageLevel}`}>
                                            {city.damageLevel}
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Casualties */}
                    {analysis.casualties && (
                      <div className="summary-section casualties">
                        <h4>👥 Víctimas Estimadas</h4>
                        <div className="casualties-grid">
                          <div className="casualty-stat">
                            <span className="casualty-number">
                              {analysis.casualties.estimatedDeaths?.toLocaleString() || 'N/A'}
                            </span>
                            <span className="casualty-label">Fallecidos</span>
                          </div>
                          <div className="casualty-stat">
                            <span className="casualty-number">
                              {analysis.casualties.estimatedInjured?.toLocaleString() || 'N/A'}
                            </span>
                            <span className="casualty-label">Heridos</span>
                          </div>
                        </div>
                        {analysis.casualties.breakdown && (
                          <div className="casualties-breakdown">
                            <h5>Desglose por zona:</h5>
                            <ul className="breakdown-list">
                              {analysis.casualties.breakdown.zone_20psi && (
                                <li>🔴 Zona 20 psi: {analysis.casualties.breakdown.zone_20psi.toLocaleString()} fallecidos</li>
                              )}
                              {analysis.casualties.breakdown.zone_5psi && (
                                <li>🟠 Zona 5 psi: {analysis.casualties.breakdown.zone_5psi.toLocaleString()} fallecidos</li>
                              )}
                              {analysis.casualties.breakdown.zone_1psi && (
                                <li>🟡 Zona 1 psi: {analysis.casualties.breakdown.zone_1psi.toLocaleString()} fallecidos</li>
                              )}
                              {analysis.casualties.breakdown.thermal && (
                                <li>🔥 Radiación térmica: {analysis.casualties.breakdown.thermal.toLocaleString()} fallecidos</li>
                              )}
                            </ul>
                          </div>
                        )}
                        {analysis.casualties.methodology && (
                          <p className="methodology-note">
                            <small>📊 {analysis.casualties.methodology}</small>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Infrastructure */}
                    {analysis.infrastructure && (
                      <div className="summary-section">
                        <h4>🏗️ Infraestructura</h4>
                        <ul className="info-list">
                          {analysis.infrastructure.buildingsDestroyed && (
                            <li>Edificios destruidos: <strong>{analysis.infrastructure.buildingsDestroyed.toLocaleString()}</strong></li>
                          )}
                          {analysis.infrastructure.buildingsDamaged && (
                            <li>Edificios dañados: <strong>{analysis.infrastructure.buildingsDamaged.toLocaleString()}</strong></li>
                          )}
                          {analysis.infrastructure.economicLoss && (
                            <li>Pérdida económica estimada: <strong>{analysis.infrastructure.economicLoss}</strong></li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* Environmental */}
                    {analysis.environmental && (
                      <div className="summary-section">
                        <h4>🌋 Efectos Ambientales</h4>
                        <ul className="info-list">
                          {analysis.environmental.craterDiameter && (
                            <li>Diámetro del cráter: <strong>{analysis.environmental.craterDiameter}</strong></li>
                          )}
                          {analysis.environmental.seismicMagnitude && (
                            <li>Magnitud sísmica: <strong>{analysis.environmental.seismicMagnitude}</strong></li>
                          )}
                          {analysis.environmental.atmosphericEffects && (
                            <li>Efectos atmosféricos: <strong>{analysis.environmental.atmosphericEffects}</strong></li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Dashboard View */}
                {viewMode === 'dashboard' && (
                  <div className="dashboard-view">
                    {/* Location Header */}
                    {analysis.location && (
                      <div className="dashboard-header">
                        <div className="location-badge">
                          📍 {analysis.location.city}
                        </div>
                        <div className="location-details">
                          {analysis.location.region} • {analysis.location.country}
                        </div>
                      </div>
                    )}

                    {/* Impact Zones Overview */}
                    <div className="zones-overview">
                      <h4>🎯 Zonas de Afectación</h4>
                      <div className="zones-grid">
                        <div className="zone-card zone-critical">
                          <div className="zone-header">
                            <span className="zone-icon">🔴</span>
                            <span className="zone-name">Destrucción Total</span>
                          </div>
                          <div className="zone-value">{impactData.R_20psi.toFixed(2)} km</div>
                          <div className="zone-area">{(Math.PI * impactData.R_20psi * impactData.R_20psi).toFixed(1)} km²</div>
                        </div>
                        <div className="zone-card zone-severe">
                          <div className="zone-header">
                            <span className="zone-icon">🟠</span>
                            <span className="zone-name">Daño Severo</span>
                          </div>
                          <div className="zone-value">{impactData.R_5psi.toFixed(2)} km</div>
                          <div className="zone-area">{(Math.PI * impactData.R_5psi * impactData.R_5psi).toFixed(1)} km²</div>
                        </div>
                        <div className="zone-card zone-moderate">
                          <div className="zone-header">
                            <span className="zone-icon">🟡</span>
                            <span className="zone-name">Daño Moderado</span>
                          </div>
                          <div className="zone-value">{impactData.R_1psi.toFixed(2)} km</div>
                          <div className="zone-area">{(Math.PI * impactData.R_1psi * impactData.R_1psi).toFixed(1)} km²</div>
                        </div>
                        <div className="zone-card zone-thermal">
                          <div className="zone-header">
                            <span className="zone-icon">🔥</span>
                            <span className="zone-name">Radiación Térmica</span>
                          </div>
                          <div className="zone-value">{impactData.R_thermal.toFixed(2)} km</div>
                          <div className="zone-area">{(Math.PI * impactData.R_thermal * impactData.R_thermal).toFixed(1)} km²</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="metrics-section">
                      <h4>📊 Estimación de Víctimas</h4>
                      <div className="metrics-grid-large">
                        <div className="metric-card-large deaths">
                          <div className="metric-header">
                            <span className="metric-icon-large">☠️</span>
                            <span className="metric-title">Fallecidos</span>
                          </div>
                          <div className="metric-value-large">
                            {analysis.casualties?.estimatedDeaths?.toLocaleString() || '0'}
                          </div>
                          {analysis.casualties?.breakdown && (
                            <div className="metric-breakdown">
                              <div className="breakdown-item">
                                <span className="breakdown-dot red"></span>
                                <span className="breakdown-text">20psi: {analysis.casualties.breakdown.zone_20psi?.toLocaleString() || 0}</span>
                              </div>
                              <div className="breakdown-item">
                                <span className="breakdown-dot orange"></span>
                                <span className="breakdown-text">5psi: {analysis.casualties.breakdown.zone_5psi?.toLocaleString() || 0}</span>
                              </div>
                              <div className="breakdown-item">
                                <span className="breakdown-dot yellow"></span>
                                <span className="breakdown-text">1psi: {analysis.casualties.breakdown.zone_1psi?.toLocaleString() || 0}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="metric-card-large injured">
                          <div className="metric-header">
                            <span className="metric-icon-large">🏥</span>
                            <span className="metric-title">Heridos</span>
                          </div>
                          <div className="metric-value-large">
                            {analysis.casualties?.estimatedInjured?.toLocaleString() || '0'}
                          </div>
                          <div className="metric-subtitle">
                            Requieren atención médica inmediata
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Infrastructure Impact */}
                    {analysis.infrastructure && (
                      <div className="infrastructure-section">
                        <h4>🏗️ Daños a Infraestructura</h4>
                        <div className="infrastructure-grid">
                          <div className="infra-card">
                            <span className="infra-value">{analysis.infrastructure.buildingsDestroyed?.toLocaleString() || 'N/A'}</span>
                            <span className="infra-label">Edificios Destruidos</span>
                          </div>
                          <div className="infra-card">
                            <span className="infra-value">{analysis.infrastructure.buildingsDamaged?.toLocaleString() || 'N/A'}</span>
                            <span className="infra-label">Edificios Dañados</span>
                          </div>
                          <div className="infra-card economic">
                            <span className="infra-value">{analysis.infrastructure.economicLoss || 'N/A'}</span>
                            <span className="infra-label">Pérdida Económica</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Environmental Impact */}
                    {analysis.environmental && (
                      <div className="environmental-section">
                        <h4>🌋 Efectos Ambientales</h4>
                        <div className="env-grid-detailed">
                          {analysis.environmental.craterDiameter && (
                            <div className="env-detail-card">
                              <span className="env-icon-lg">🕳️</span>
                              <div className="env-info">
                                <span className="env-value-lg">{analysis.environmental.craterDiameter}</span>
                                <span className="env-label-lg">Diámetro del Cráter</span>
                              </div>
                            </div>
                          )}
                          {analysis.environmental.seismicMagnitude && (
                            <div className="env-detail-card">
                              <span className="env-icon-lg">📊</span>
                              <div className="env-info">
                                <span className="env-value-lg">{analysis.environmental.seismicMagnitude}</span>
                                <span className="env-label-lg">Magnitud Sísmica</span>
                              </div>
                            </div>
                          )}
                        </div>
                        {analysis.environmental.atmosphericEffects && (
                          <div className="env-effects">
                            <p>{analysis.environmental.atmosphericEffects}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Methodology */}
                    {analysis.casualties?.methodology && (
                      <div className="methodology-section">
                        <h5>📐 Metodología de Cálculo</h5>
                        <p>{analysis.casualties.methodology}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Refresh Button */}
                <button onClick={handleAnalyze} className="btn-refresh">
                  🔄 Regenerar Análisis
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
