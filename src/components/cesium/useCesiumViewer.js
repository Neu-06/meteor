"use client";
import { useEffect, useRef } from "react";
import {
  Viewer,
  Ion,
  Cartesian3,
  Cartographic,
  Color,
  LabelStyle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  createDefaultImageryProviderViewModels,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { toDeg } from "./utils";

export function useCesiumViewer(params, setParams) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const crosshairRef = useRef(null);
  const clickHandlerRef = useRef(null);
  const initialParamsRef = useRef(params); // Capturar params iniciales

  useEffect(() => {
    // Configure Cesium base and token
    Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNGFjNjZiZC04ODUyLTRkZjktYjY2ZS0xYTc2NWI0ODI4YjMiLCJpZCI6MzQ3MTcwLCJpYXQiOjE3NTk1OTEzMDd9.Hrg7qCeHEAXfkquLvpFvU1QEfIdtH2YN6FE2sa6IpIU";
    window.CESIUM_BASE_URL = "/cesium/";

    // Solo mostrar los providers de Cesium ion (los primeros del array default)
    const allProviders = createDefaultImageryProviderViewModels();
    // Filtra solo los que están antes de la sección 'Other' (los de Cesium ion)
    // Cesium ion providers suelen estar al inicio, hasta que cambia el groupName a 'Other'
    const cesiumIonProviders = [];
    for (const provider of allProviders) {
      if (provider.category && provider.category.toLowerCase().includes('other')) break;
      cesiumIonProviders.push(provider);
    }

    const viewer = new Viewer(containerRef.current, {
      shouldAnimate: true,
      timeline: false,
      animation: false,
      homeButton: false,
      sceneModePicker: true,
      baseLayerPicker: true,
      navigationHelpButton: false,
      geocoder: false,
      infoBox: false,
      fullscreenButton: false,
      shadows: false,
      selectionIndicator: false,
      imageryProviderViewModels: cesiumIonProviders,
      // Optimizaciones de rendimiento
      requestRenderMode: false, // Desactivar para evitar problemas de sincronización
      maximumRenderTimeChange: Infinity, // Sin límite de tiempo de render
    });
    viewerRef.current = viewer;

    // Configuraciones visuales optimizadas
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.hueShift = 0.01;
    viewer.scene.skyAtmosphere.saturationShift = -0.05;
    viewer.scene.skyAtmosphere.brightnessShift = -0.1;
    
    // Optimizaciones de rendimiento
    viewer.scene.globe.maximumScreenSpaceError = 2; // Reducir detalle del terreno para mejor rendimiento
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;
    
    // Configurar cámara para movimientos más suaves
    viewer.camera.percentageChanged = 0.1; // Menos sensibilidad en cambios de cámara
    
    // Configurar seguimiento de entidades más suave
    viewer.camera.defaultMoveAmount = 100.0;
    viewer.camera.defaultLookAmount = Math.PI / 60.0;
    viewer.camera.defaultRotateAmount = Math.PI / 3600.0;
    viewer.camera.defaultZoomAmount = 100.0;

    // Hide credits
    setTimeout(() => {
      const credit = document.querySelector(".cesium-credit-container");
      if (credit) credit.style.display = "none";
    }, 1000);

    // Initial crosshair entity para punto de entrada
    crosshairRef.current = viewer.entities.add({
      position: Cartesian3.fromDegrees(initialParamsRef.current.lon, initialParamsRef.current.lat),
      point: {
        pixelSize: 10,
        color: Color.CYAN,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: "Entrada",
        scale: 0.6,
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian3(0, -18, 0),
      },
    });

    // Click-to-set Lat/Lon handler restaurado - SIN movimiento de cámara
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position);
      if (!cartesian) return;
      const carto = Cartographic.fromCartesian(cartesian);
      const lat = toDeg(carto.latitude);
      const lon = toDeg(carto.longitude);
      
      // Actualizar parámetros SIN afectar la cámara
      setParams((p) => ({ ...p, lat, lon }));
      
      // Actualizar posición del crosshair SIN mover la cámara
      if (crosshairRef.current) {
        crosshairRef.current.position = Cartesian3.fromDegrees(lon, lat);
      }
      
      // Prevenir cualquier movimiento automático de cámara
      // No hay flyTo, no hay setView, solo actualizar el marcador
    }, ScreenSpaceEventType.LEFT_CLICK);
    clickHandlerRef.current = handler;

    return () => {
      try {
        // Detener cualquier operación antes de limpiar
        if (viewer && !viewer.isDestroyed()) {
          viewer.clock.shouldAnimate = false;
          viewer.trackedEntity = undefined;
          
          try {
            viewer.camera.lookAtTransform(Matrix4.IDENTITY);
          } catch (e) {
            console.warn('Error reseteando camera transform en cleanup:', e);
          }
          
          // Limpiar entidades antes de destruir
          try {
            viewer.entities.removeAll();
          } catch (e) {
            console.warn('Error limpiando entidades en cleanup:', e);
          }
        }
        
        if (handler && !handler.isDestroyed()) {
          handler.destroy();
        }
      } catch (e) {
        console.warn('Error limpiando handler:', e);
      }
      
      // Destruir viewer con delay para evitar conflictos
      setTimeout(() => {
        try {
          if (viewer && !viewer.isDestroyed()) {
            viewer.destroy();
          }
        } catch (e) {
          console.warn('Error destruyendo viewer:', e);
        }
      }, 100);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar UNA VEZ al montar - NO recrear por cambios de parámetros

  // useEffect separado para actualizar crosshair cuando parámetros cambien externamente
  useEffect(() => {
    if (crosshairRef.current && viewerRef.current) {
      // Solo actualizar posición del crosshair SIN mover cámara
      crosshairRef.current.position = Cartesian3.fromDegrees(params.lon, params.lat);
    }
  }, [params.lat, params.lon]);

  // helper to reset or move the crosshair - SIN mover cámara
  function resetCrosshair(lat, lon) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    
    // Remover crosshair anterior si existe
    if (crosshairRef.current) {
      viewer.entities.remove(crosshairRef.current);
    }
    
    // Crear nuevo crosshair SIN afectar la cámara
    crosshairRef.current = viewer.entities.add({
      position: Cartesian3.fromDegrees(lon, lat),
      point: {
        pixelSize: 10,
        color: Color.CYAN,
        outlineColor: Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: "Entrada",
        scale: 0.6,
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian3(0, -18, 0),
      },
    });
    
    // NO mover la cámara - mantener la vista actual
  }

  return { containerRef, viewerRef, resetCrosshair };
}
