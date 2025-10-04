"use client";
import { useState } from "react";

export default function MeteoriteParamsPanel() {
  const [velocity, setVelocity] = useState(20);
  const [size, setSize] = useState(10);
  const [angle, setAngle] = useState(45);

  return (
    <aside className="w-full sm:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 sm:p-6 flex flex-col gap-4 shadow transition-colors">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">
        Parámetros
      </h2>
      <label className="flex flex-col text-gray-700 dark:text-gray-200">
        Velocidad (km/s)
        <input
          type="number"
          min={1}
          max={100}
          value={velocity}
          onChange={e => setVelocity(Number(e.target.value))}
          className="border rounded px-2 py-1 mt-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200">
        Tamaño (m)
        <input
          type="number"
          min={1}
          max={1000}
          value={size}
          onChange={e => setSize(Number(e.target.value))}
          className="border rounded px-2 py-1 mt-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </label>
      <label className="flex flex-col text-gray-700 dark:text-gray-200">
        Ángulo de impacto (°)
        <input
          type="number"
          min={0}
          max={90}
          value={angle}
          onChange={e => setAngle(Number(e.target.value))}
          className="border rounded px-2 py-1 mt-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </label>
      <button
        className="mt-4 bg-blue-700 dark:bg-blue-800 text-white rounded px-4 py-2 font-bold hover:bg-blue-800 dark:hover:bg-blue-900 transition"
        onClick={() => alert("Simulación iniciada (aquí irá la lógica)")}
      >
        Simular
      </button>
    </aside>
  );
}