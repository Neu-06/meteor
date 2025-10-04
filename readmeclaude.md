🌎 Simulador de Impacto de Meteoritos
🎯 Objetivo

Este proyecto permite visualizar impactos de meteoritos en el globo 3D usando CesiumJS y datos reales de la API de NASA (NeoWs).
La meta es proporcionar una experiencia educativa e interactiva para explorar posibles escenarios de impacto, ajustando parámetros y mostrando zonas afectadas.

🚀 Funcionalidades Actuales

🌍 Globo 3D interactivo con CesiumJS.

📍 Selección de punto de impacto haciendo clic en el mapa.

🎚️ Panel lateral de control de simulación:

Latitud / Longitud

Rumbo (°)

Ángulo (°)

Velocidad (km/s)

Diámetro (m)

Densidad (kg/m³)

🔴🟠🟡 Visualización de anillos concéntricos que representan:

🔴 Daño severo

🟠 Daño alto

🟡 Daño moderado

🟢 Botón Simular impacto

⚫ Botón Reset para limpiar la simulación

📦 Estructura del Proyecto

Todo se maneja desde el frontend (Next.js):

frontend/
├─ src/
│  ├─ app/            # Páginas principales
│  ├─ components/     # UI (panel, sliders, etc.)
│  ├─ lib/            # Lógica para cálculos y consumo de APIs
│  └─ styles/         # Estilos
└─ public/
   └─ cesium/         # Assets de CesiumJS

🔑 Configuración
1. Variables de entorno

Crea el archivo .env.local en la raíz del proyecto:

NEXT_PUBLIC_NASA_API_KEY=4g9R6sdcc42SYmWzgvZMCvcHcBRYAM04K3WcUhNm
NEXT_PUBLIC_CESIUM_BASE_URL=/cesium

2. Instalación de dependencias
cd frontend
pnpm install
pnpm add cesium axios

3. Servir assets de Cesium

Verifica que los assets de Cesium estén en public/cesium.

🌐 Integración con la API de NASA (NeoWs)
Obtener objetos cercanos a la Tierra

Ejemplo (en src/lib/neo.ts):

import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY;
const BASE_URL = 'https://api.nasa.gov/neo/rest/v1';

export async function fetchFeed(start: string, end: string) {
  const { data } = await axios.get(`${BASE_URL}/feed`, {
    params: { start_date: start, end_date: end, api_key: API_KEY }
  });
  return data;
}

export async function fetchNeoDetails(id: string) {
  const { data } = await axios.get(`${BASE_URL}/neo/${id}`, {
    params: { api_key: API_KEY }
  });
  return data;
}

💥 Cálculo del impacto

Archivo src/lib/impact.ts:

export function calcImpact(diameter_m: number, velocity_kms: number, density = 3000) {
  const r = diameter_m / 2;
  const volume = (4/3) * Math.PI * r**3;
  const mass = volume * density;
  const v = velocity_kms * 1000;                // convertir km/s a m/s
  const E_J = 0.5 * mass * v * v;               // energía en Joules
  const E_MT = E_J / 4.184e15;                  // convertir a megatones de TNT

  const base_km = 2 * Math.cbrt(E_MT);          // radio base (educativo)

  return {
    energy_MT: E_MT,
    rings_km: {
      red: base_km,
      orange: base_km * 3,
      yellow: base_km * 6
    }
  };
}


⚠️ Nota: Las fórmulas son aproximadas, pensadas para propósitos educativos y visualización interactiva, no cálculos físicos reales.

🟩 Flujo de Uso

Iniciar el proyecto:

pnpm dev


Abrir http://localhost:3000
.

Hacer clic en un punto del globo → se fijan coordenadas Lat/Lon.

Ajustar parámetros (velocidad, diámetro, densidad).

Presionar Simular impacto → aparecen los anillos de afectación.

Usar Reset para limpiar el escenario.

📈 Próximos Pasos

 Integrar la lista de NEOs desde la API de NASA en el panel lateral.

 Permitir elegir un NEO → usar su diámetro, velocidad y densidad para simular.

 Mostrar energía de impacto y radios estimados en el panel.

 Mejorar los modelos físicos para mayor realismo.

🗒️ Notas

Este proyecto es principalmente educativo y demuestra integración de APIs, visualización 3D e interacción con el usuario.

Usar el NEXT_PUBLIC_NASA_API_KEY válido para garantizar el acceso a los datos.

Los radios de las zonas de daño se calculan de forma aproximada para visualizar rápidamente el alcance de un impacto.