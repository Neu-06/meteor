"use client";
import React from "react";

export default function ImpactInfoBox({ lat, lon, energyMt, diameter, speed, selectedNeo }) {
  return (
    <div className="fixed inset-x-0 bottom-3 z-50 flex justify-center pointer-events-none">
      <div
        className="bg-black/80 text-white rounded-lg shadow-lg px-3 py-2 w-full max-w-72 sm:max-w-72 md:max-w-72 border border-white/20 backdrop-blur-md pointer-events-auto text-center"
        style={{ minWidth: 0 }}
      >
        <div className="font-bold text-base mb-1 flex flex-col items-center gap-2 text-center">
          <span>💥 Impacto</span>
          {selectedNeo && (
            <span className="bg-blue-900/60 rounded px-1 py-0.5 text-xs ml-1 truncate max-w-[50px]">{selectedNeo.name}</span>
          )}
        </div>
        <div className="space-y-0.5 text-xs text-center">
          <div>
            <span className="font-semibold">Coordenadas:</span> {lat?.toFixed(2)}, {lon?.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold">Energía:</span> {energyMt?.toFixed(2)} Mt
          </div>
          <div>
            <span className="font-semibold">Ø:</span> {diameter?.toFixed(0)} m
          </div>
          <div>
            <span className="font-semibold">Vel:</span> {speed?.toFixed(1)} km/s
          </div>
        </div>
      </div>
    </div>
  );
}
