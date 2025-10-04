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
    });
    viewerRef.current = viewer;

    // Cinematic tweaks
    viewer.scene.postProcessStages.fxaa.enabled = true;
    viewer.scene.globe.enableLighting = true;
    viewer.scene.skyAtmosphere.hueShift = 0.01;
    viewer.scene.skyAtmosphere.saturationShift = -0.05;
    viewer.scene.skyAtmosphere.brightnessShift = -0.1;

    // Hide credits
    setTimeout(() => {
      const credit = document.querySelector(".cesium-credit-container");
      if (credit) credit.style.display = "none";
    }, 1000);

    // Initial crosshair entity
    crosshairRef.current = viewer.entities.add({
      position: Cartesian3.fromDegrees(params.lon, params.lat),
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

    // Click-to-set Lat/Lon handler
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click) => {
      const cartesian = viewer.camera.pickEllipsoid(click.position);
      if (!cartesian) return;
      const carto = Cartographic.fromCartesian(cartesian);
      const lat = toDeg(carto.latitude);
      const lon = toDeg(carto.longitude);
      setParams((p) => ({ ...p, lat, lon }));
      if (crosshairRef.current) {
        crosshairRef.current.position = Cartesian3.fromDegrees(lon, lat);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    clickHandlerRef.current = handler;

    return () => {
      try {
        if (handler) handler.destroy();
      } catch {}
      try {
        if (viewer) viewer.destroy();
      } catch {}
    };
  }, []); // initialize once

  // helper to reset or move the crosshair
  function resetCrosshair(lat, lon) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (crosshairRef.current) {
      viewer.entities.remove(crosshairRef.current);
    }
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
  }

  return { containerRef, viewerRef, resetCrosshair };
}
