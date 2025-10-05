'use client';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Analyze meteor impact using Gemini AI
 * @param {Object} impactData - Impact data containing location, radii, energy, etc.
 * @returns {Promise<Object>} AI analysis with affected countries, casualties, etc.
 */
export async function analyzeImpactWithGemini(impactData) {
  const {
    lat,
    lon,
    R_20psi, // km
    R_5psi,  // km
    R_1psi,  // km
    R_thermal, // km
    MT, // megatons
    KT, // kilotons
    diameter, // meters
    speed, // km/s
    neoName,
    density, // kg/m3
    angle, // entry angle degrees
    heading, // entry heading degrees
  } = impactData;

  // Calcular áreas afectadas (círculos)
  const area_20psi = Math.PI * R_20psi * R_20psi; // km²
  const area_5psi = Math.PI * R_5psi * R_5psi;
  const area_1psi = Math.PI * R_1psi * R_1psi;
  const area_thermal = Math.PI * R_thermal * R_thermal;

  const prompt = `Devuelve el JSON lo MÁS RÁPIDO que puedas con datos muy precisos lo más acercado a la realidad posible, nada de cifras descabelladas:
Un asteroide con un diametro de ${diameter}m impacta en ${lat.toFixed(2)}°, ${lon.toFixed(2)}° con energía de ${MT.toFixed(1)} megatones. 
Tiene una velocidad de ${speed.toFixed(1)} km/s, densidad de ${density} kg/m3, ángulo de entrada de ${angle}° y rumbo de ${heading}°.

Zona 20psi (destrucción total): ${R_20psi.toFixed(1)} km radio
Zona 5psi (daño severo): ${R_5psi.toFixed(1)} km radio
Zona 1psi (daño moderado): ${R_1psi.toFixed(1)} km radio

Responde SOLO con este JSON:
{
  "location": {"city": "nombre", "region": "región", "country": "país"},
  "affectedCountries": [{"name": "país", "percentageAffected": 1, "affectedArea": 100, "majorCitiesAffected": [{"name": "ciudad", "distance": 10, "population": 100000, "damageLevel": "severo"}]}],
  "casualties": {"estimatedDeaths": 50000, "estimatedInjured": 100000, "breakdown": {"zone_20psi": 10000, "zone_5psi": 30000, "zone_1psi": 10000, "thermal": 0}, "methodology": "densidad x área x tasa"},
  "infrastructure": {"buildingsDestroyed": 10000, "buildingsDamaged": 50000, "economicLoss": "$10 mil millones", "criticalInfrastructure": []},
  "environmental": {"craterDepth": "300 m", "seismicMagnitude": 6.5, "atmosphericEffects": "polvo regional", "fireball": "500 km"},
  "summary": "Resumen breve del impacto"
}`;

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('API key de Gemini no configurada. Verifica NEXT_PUBLIC_GEMINI_API_KEY en .env.local');
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    console.log('=== FULL GEMINI RESPONSE ===');
    console.log(JSON.stringify(data, null, 2));
    console.log('============================');

    // Check for safety blocking
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Gemini bloqueó la petición: ${data.promptFeedback.blockReason}. Razón de seguridad.`);
    }

    // Check if response was blocked by safety filters
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new Error(`Gemini no completó la respuesta: ${candidate.finishReason}. ${candidate.finishReason === 'SAFETY' ? 'Bloqueado por filtros de seguridad.' : ''}`);
    }

    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('Gemini response structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length,
        finishReason: candidate?.finishReason,
        hasContent: !!candidate?.content,
        hasParts: !!candidate?.content?.parts,
        partsLength: candidate?.content?.parts?.length,
        safetyRatings: candidate?.safetyRatings,
        promptFeedback: data.promptFeedback,
        fullData: data
      });
      throw new Error('Gemini no devolvió ningún texto en la respuesta. Verifica la estructura en la consola.');
    }

    console.log('=== GEMINI RAW RESPONSE ===');
    console.log(text);
    console.log('=========================');

    // Extract JSON from markdown code blocks if present
    let jsonText = text.trim();

    // Try to extract from ```json or ``` blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1].trim();
    } else {
      // Try to find JSON object
      const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0].trim();
      }
    }

    console.log('=== EXTRACTED JSON ===');
    console.log(jsonText);
    console.log('====================');

    if (!jsonText || jsonText === '{}') {
      throw new Error('Gemini devolvió JSON vacío. Verifica la respuesta.');
    }

    // Clean up common JSON formatting issues from Gemini
    jsonText = jsonText
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/,(\s*\n\s*[}\]])/g, '$1'); // Remove trailing commas before closing brackets on new lines

    let analysis;
    try {
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Problematic JSON:', jsonText);
      console.error('Error details:', parseError.message);

      // Try to fix common issues and retry
      try {
        // More aggressive cleaning
        const cleanedJson = jsonText
          .replace(/,\s*}/g, '}') // Remove trailing commas before }
          .replace(/,\s*]/g, ']') // Remove trailing commas before ]
          .replace(/:\s*,/g, ': null,') // Replace empty values with null
          .replace(/"\s*:\s*"/g, '": "'); // Fix spacing issues

        analysis = JSON.parse(cleanedJson);
        console.log('JSON parsed successfully after cleanup');
      } catch (retryError) {
        throw new Error(`Error al parsear JSON de Gemini: ${parseError.message}. La respuesta de Gemini está mal formada.`);
      }
    }

    // Validate and set defaults for required fields
    if (!analysis.casualties) {
      analysis.casualties = {
        estimatedDeaths: 0,
        estimatedInjured: 0,
        breakdown: {
          zone_20psi: 0,
          zone_5psi: 0,
          zone_1psi: 0,
          thermal: 0
        },
        methodology: "No hay población en la zona de impacto"
      };
    }

    if (!analysis.affectedCountries || analysis.affectedCountries.length === 0) {
      analysis.affectedCountries = [{
        name: analysis.location?.country || "Desconocido",
        percentageAffected: 0,
        affectedArea: 0,
        majorCitiesAffected: []
      }];
    }

    console.log('=== PARSED ANALYSIS ===');
    console.log(JSON.stringify(analysis, null, 2));
    console.log('======================');

    return analysis;
  } catch (error) {
    console.error('Error analyzing impact with Gemini:', error);
    throw error;
  }
}
