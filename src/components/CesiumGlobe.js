'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Viewer, Ion, Math as CMath, Cartesian3, Cartographic, Color, JulianDate,
  PolylineGlowMaterialProperty, SampledPositionProperty, EllipsoidGeodesic,
  ScreenSpaceEventHandler, ScreenSpaceEventType, LabelStyle, NearFarScalar,
  ImageMaterialProperty
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

export default function CesiumGlobe() {
  const container = useRef(null);
  const viewerRef = useRef(null);
  const crosshairRef = useRef(null);

  const [params, setParams] = useState({
    lat: -16.5, lon: -68.15, // La Paz por defecto
    heading: 80,  // rumbo°
    angle: 25,    // entrada°
    speed: 18,    // km/s
    diameter: 120, // m
    density: 3000, // kg/m3
    autoZoom: true
  });

  // utils
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  function forwardGeodesic(latDeg, lonDeg, bearingDeg, distanceMeters) {
    const start = Cartographic.fromDegrees(lonDeg, latDeg);
    const lat1 = toRad(latDeg), lon1 = toRad(lonDeg), brng = toRad(bearingDeg);
    const R = 6371008.8; // radio medio m
    const δ = distanceMeters / R;
    const lat2 = Math.asin(Math.sin(lat1)*Math.cos(δ)+Math.cos(lat1)*Math.sin(δ)*Math.cos(brng));
    const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(δ)*Math.cos(lat1),
                                   Math.cos(δ)-Math.sin(lat1)*Math.sin(lat2));
    return { lat: toDeg(lat2), lon: ((toDeg(lon2)+540)%360)-180 };
  }

  function energyAndRadius(diameter_m, density_kgm3, speed_kms) {
    const r = diameter_m / 2;
    const volume = (4/3)*Math.PI*r**3;
    const mass = volume * density_kgm3;
    const v = speed_kms*1000;
    const E = 0.5*mass*v*v;           // J
    const MT = E / 4.184e15;          // megatones TNT
    const R_km = 1.8 * Math.cbrt(MT); // aprox. radio 5 psi
    return { E_J: E, MT, R_km };
  }

  // init viewer
  useEffect(() => {
    Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNGFjNjZiZC04ODUyLTRkZjktYjY2ZS0xYTc2NWI0ODI4YjMiLCJpZCI6MzQ3MTcwLCJpYXQiOjE3NTk1OTEzMDd9.Hrg7qCeHEAXfkquLvpFvU1QEfIdtH2YN6FE2sa6IpIU';
    window.CESIUM_BASE_URL = '/cesium/';

    const viewer = new Viewer(container.current, {
      shouldAnimate: true,
      timeline: false, animation: false, homeButton: false,
      sceneModePicker: false, baseLayerPicker: false,
      navigationHelpButton: false, geocoder: false, infoBox: false,fullscreenButton: false, shadows: false
    });
      selectionIndicator: false, 
    viewerRef.current = viewer;

    // escena más “cinematográfica”
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.hueShift = 0.01;
    viewer.scene.skyAtmosphere.saturationShift = -0.05;
    viewer.scene.skyAtmosphere.brightnessShift = -0.1;

    // oculta créditos
    setTimeout(() => {
      const credit = document.querySelector('.cesium-credit-container');
      if (credit) credit.style.display = 'none';
    }, 600);

    // crosshair para lat/lon con click
    crosshairRef.current = viewer.entities.add({
      position: Cartesian3.fromDegrees(params.lon, params.lat),
      point: { pixelSize: 10, color: Color.CYAN, outlineColor: Color.WHITE, outlineWidth: 2 },
      label: {
        text: 'Entrada',
        scale: 0.6, fillColor: Color.WHITE, outlineColor: Color.BLACK,
        style: LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cartesian3(0, -18, 0)
      }
    });

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position);
      if (!cartesian) return;
      const carto = Cartographic.fromCartesian(cartesian);
      const lat = toDeg(carto.latitude), lon = toDeg(carto.longitude);
      setParams(p => ({ ...p, lat, lon }));
      crosshairRef.current.position = Cartesian3.fromDegrees(lon, lat);
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      viewer && viewer.destroy();
    };
  }, []);

  // disco térmico suave (canvas radial)
  function makeHeatDisk(size = 512, color='rgba(255,120,0,1)') {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.25, color);
    g.addColorStop(0.6, 'rgba(255,120,0,0.25)');
    g.addColorStop(1, 'rgba(255,120,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.fill();
    return c;
  }

  function circlePositions(centerLat, centerLon, radiusKm, segments = 180) {
    const arr = [];
    for (let i = 0; i <= segments; i++) {
      const brg = (360 * i) / segments;
      const dest = forwardGeodesic(centerLat, centerLon, brg, radiusKm * 1000);
      arr.push(Cartesian3.fromDegrees(dest.lon, dest.lat, 20));
    }
    return arr;
  }

  function runSimulation() {
    const viewer = viewerRef.current; if (!viewer) return;
    const { lat, lon, heading, angle, speed, diameter, density, autoZoom } = params;

    viewer.entities.removeAll();
    // re-coloca crosshair
    crosshairRef.current = viewer.entities.add({
      position: Cartesian3.fromDegrees(lon, lat),
      point: { pixelSize: 10, color: Color.CYAN, outlineColor: Color.WHITE, outlineWidth: 2 },
      label: { text: 'Entrada', scale: 0.6, fillColor: Color.WHITE, outlineColor: Color.BLACK,
               style: LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cartesian3(0, -18, 0) }
    });

    const startAlt = 100000;         // 100 km
    const v_ms = speed * 1000;
    const angleRad = toRad(angle);
    const groundSpeed = v_ms * Math.cos(angleRad);
    const descentRate = Math.max(1, v_ms * Math.sin(angleRad));
    const timeToImpact = Math.ceil(startAlt / descentRate);

    const dt = 0.5;
    const steps = Math.min(4000, Math.ceil(timeToImpact / dt));
    const posProp = new SampledPositionProperty();
    const start = JulianDate.now();
    let t = 0, curLat = lat, curLon = lon, curAlt = startAlt;
    const polyPositions = [];

    // partículas (trail de puntos)
    const sparkEntities = [];

    for (let i = 0; i <= steps; i++) {
      const dist = groundSpeed * dt;
      const moved = forwardGeodesic(curLat, curLon, heading, dist);
      curLat = moved.lat; curLon = moved.lon;
      curAlt = Math.max(0, startAlt - descentRate * (t + dt));

      const cart = Cartesian3.fromDegrees(curLon, curLat, curAlt);
      posProp.addSample(JulianDate.addSeconds(start, t, new JulianDate()), cart);
      polyPositions.push(cart);

      // pequeñas chispas detrás
      if (i % 3 === 0) {
        const age = i/steps;
        const e = viewer.entities.add({
          position: cart,
          point: { pixelSize: 3 + 3*Math.random(), color: Color.ORANGE.withAlpha(0.6 - 0.5*age) }
        });
        sparkEntities.push(e);
        setTimeout(()=> viewer.entities.remove(e), 1500);
      }

      t += dt;
      if (curAlt <= 0) break;
    }

    // meteoro animado
    const meteor = viewer.entities.add({
      position: posProp,
      point: {
        pixelSize: 12,
        color: Color.fromCssColorString('#ff7b00'),
        outlineColor: Color.WHITE, outlineWidth: 2,
        translucencyByDistance: new NearFarScalar(1e2, 1.0, 1e7, 0.2)
      },
      path: {
        leadTime: 0, trailTime: Math.min(60, timeToImpact),
        width: 3.0,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Color.fromCssColorString('#ffd000').withAlpha(0.85)
        })
      }
    });

    // polilínea completa
    viewer.entities.add({
      polyline: { positions: polyPositions, width: 2, material: Color.YELLOW.withAlpha(0.8) }
    });

    // impacto + anillos + disco térmico
    const { MT, R_km } = energyAndRadius(diameter, density, speed);
    const impactPos = Cartesian3.fromDegrees(curLon, curLat, 10);

    // Disco suave
    const heatDisk = makeHeatDisk(512, 'rgba(255,140,0,1)');
    viewer.entities.add({
      position: impactPos,
      ellipse: {
        semiMajorAxis: (R_km*600),  // disco central “glow” más pequeño que el radio de daño
        semiMinorAxis: (R_km*600),
        material: new ImageMaterialProperty({ image: heatDisk, transparent: true }),
        height: 15
      }
    });

    // anillos (daño 0.5R, 1.0R, 1.6R)
    const rings = [
      { r: Math.max(5, R_km*0.5), fill:'#ff2d2d', alpha:0.28, outline:'#ff2d2d' },
      { r: Math.max(10, R_km*1.0), fill:'#ff9900', alpha:0.22, outline:'#ff9900' },
      { r: Math.max(20, R_km*1.6), fill:'#ffd54a', alpha:0.18, outline:'#ffd54a' }
    ];
    rings.forEach(rg => {
      viewer.entities.add({
        polygon: {
          hierarchy: circlePositions(curLat, curLon, rg.r),
          material: Color.fromCssColorString(rg.fill).withAlpha(rg.alpha),
          outline: true,
          outlineColor: Color.fromCssColorString(rg.outline).withAlpha(0.65),
          height: 15
        }
      });
    });

    // etiqueta
    viewer.entities.add({
      position: impactPos,
      label: {
        text: `Impacto\n${curLat.toFixed(2)}, ${curLon.toFixed(2)}\nE≈${MT.toFixed(2)} Mt`,
        scale: 0.7, fillColor: Color.WHITE, outlineColor: Color.BLACK,
        style: LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cartesian3(0,-28,0)
      }
    });

    if (autoZoom) {
      // encuadre que muestre toda la polyline + anillos
      viewer.flyTo(viewer.entities, { duration: 1.2, maximumHeight: 2_000_000 });
    }
    viewer.trackedEntity = meteor;
  }

  function resetScene() {
    const v = viewerRef.current; if (!v) return;
    v.entities.removeAll();
    crosshairRef.current = v.entities.add({
      position: Cartesian3.fromDegrees(params.lon, params.lat),
      point: { pixelSize: 10, color: Color.CYAN, outlineColor: Color.WHITE, outlineWidth: 2 },
      label: { text: 'Entrada', scale: 0.6, fillColor: Color.WHITE, outlineColor: Color.BLACK,
               style: LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cartesian3(0,-18,0) }
    });
    v.camera.flyHome(1.0);
  }

  return (
    <>
      <div ref={container} style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', zIndex:0 }} />
      <div className="glass ui-panel">
        <div className="title">Simulación de meteorito</div>

        <div className="grid2">
          <label>Lat
            <input type="number" step="0.01" value={params.lat}
              onChange={e=>setParams(p=>({...p, lat:Number(e.target.value)}))}/>
          </label>
          <label>Lon
            <input type="number" step="0.01" value={params.lon}
              onChange={e=>setParams(p=>({...p, lon:Number(e.target.value)}))}/>
          </label>

          <label>Rumbo (°)
            <input type="range" min="0" max="359" value={params.heading}
              onChange={e=>setParams(p=>({...p, heading:Number(e.target.value)}))}/>
            <span className="val">{params.heading}°</span>
          </label>
          <label>Ángulo (°)
            <input type="range" min="5" max="85" value={params.angle}
              onChange={e=>setParams(p=>({...p, angle:Number(e.target.value)}))}/>
            <span className="val">{params.angle}°</span>
          </label>

          <label>Velocidad (km/s)
            <input type="range" min="11" max="72" step="0.5" value={params.speed}
              onChange={e=>setParams(p=>({...p, speed:Number(e.target.value)}))}/>
            <span className="val">{params.speed.toFixed(1)}</span>
          </label>
          <label>Diámetro (m)
            <input type="range" min="10" max="2000" step="10" value={params.diameter}
              onChange={e=>setParams(p=>({...p, diameter:Number(e.target.value)}))}/>
            <span className="val">{params.diameter}</span>
          </label>
          <label>Densidad (kg/m³)
            <input type="range" min="500" max="8000" step="100" value={params.density}
              onChange={e=>setParams(p=>({...p, density:Number(e.target.value)}))}/>
            <span className="val">{params.density}</span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={params.autoZoom}
              onChange={e=>setParams(p=>({...p, autoZoom:e.target.checked}))}/>
            <span>Auto-zoom</span>
          </label>
        </div>

        <div className="row">
          <button className="btn primary" onClick={runSimulation}>Simular impacto</button>
          <button className="btn" onClick={resetScene}>Reset</button>
        </div>

        <div className="legend">
          <div className="dot dot-red"/> daño severo
          <div className="dot dot-orange"/> alto
          <div className="dot dot-yellow"/> moderado
        </div>
        <div className="tip">Tip: haz click en el mapa para fijar Lat/Lon de entrada.</div>
      </div>
    </>
  );
}
