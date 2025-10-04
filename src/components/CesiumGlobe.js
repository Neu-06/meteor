"use client";
import { useEffect, useRef } from "react";
import { Viewer, Ion } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function CesiumGlobe() {
  const cesiumContainer = useRef(null);

  useEffect(() => {
    Ion.defaultAccessToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlNGFjNjZiZC04ODUyLTRkZjktYjY2ZS0xYTc2NWI0ODI4YjMiLCJpZCI6MzQ3MTcwLCJpYXQiOjE3NTk1OTEzMDd9.Hrg7qCeHEAXfkquLvpFvU1QEfIdtH2YN6FE2sa6IpIU";
    window.CESIUM_BASE_URL = "/cesium/";
    let viewer;
    if (cesiumContainer.current) {
      viewer = new Viewer(cesiumContainer.current, {
        shouldAnimate: true,
        timeline: false,
        animation: false,
        homeButton: false,
        sceneModePicker: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        geocoder: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        vrButton: false,
        navigationInstructionsInitiallyVisible: false,
        creditsDisplay: false,
      });
      setTimeout(() => {
        const credit = document.querySelector(".cesium-credit-container");
        if (credit) credit.style.display = "none";
      }, 1000);
    }
    return () => {
      if (viewer) viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={cesiumContainer}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        zIndex: 0,
        borderRadius: "0.75rem",
        overflow: "hidden",
        background: "transparent",
      }}
    />
  );
}
