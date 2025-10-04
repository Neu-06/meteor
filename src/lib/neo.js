'use client';
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_NASA_API_KEY;
const BASE_URL = 'https://api.nasa.gov/neo/rest/v1';

/**
 * Fetch NEOs (Near Earth Objects) from NASA API for a date range
 * @param {string} start - Start date (YYYY-MM-DD)
 * @param {string} end - End date (YYYY-MM-DD)
 * @returns {Promise<Object>} NASA NeoWs feed data
 */
export async function fetchNeoFeed(start, end) {
  try {
    const { data } = await axios.get(`${BASE_URL}/feed`, {
      params: {
        start_date: start,
        end_date: end,
        api_key: API_KEY
      }
    });
    return data;
  } catch (error) {
    console.error('Error fetching NEO feed:', error);
    throw error;
  }
}

/**
 * Fetch detailed information about a specific NEO
 * @param {string} id - NEO ID
 * @returns {Promise<Object>} Detailed NEO data
 */
export async function fetchNeoDetails(id) {
  try {
    const { data } = await axios.get(`${BASE_URL}/neo/${id}`, {
      params: { api_key: API_KEY }
    });
    return data;
  } catch (error) {
    console.error('Error fetching NEO details:', error);
    throw error;
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Get date N days from today in YYYY-MM-DD format
 */
export function getDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Parse NEO data to extract useful parameters for simulation
 * @param {Object} neo - NEO object from NASA API
 * @returns {Object} Parsed parameters for meteor simulation
 */
export function parseNeoForSimulation(neo) {
  // Get diameter estimate (convert km to meters)
  const diameterKm = neo.estimated_diameter?.kilometers?.estimated_diameter_max || 0.1;
  const diameter = diameterKm * 1000; // convert to meters

  // Get close approach data
  const closeApproach = neo.close_approach_data?.[0];
  const velocityKms = parseFloat(closeApproach?.relative_velocity?.kilometers_per_second || 20);

  // Estimate density based on composition (approximate)
  // C-type (carbonaceous): ~1500 kg/m³
  // S-type (silicaceous): ~3000 kg/m³
  // M-type (metallic): ~5000-8000 kg/m³
  // Default to stony (S-type)
  const density = 3000;

  return {
    name: neo.name,
    id: neo.id,
    diameter: Math.min(Math.max(diameter, 10), 2000), // clamp between 10m-2000m
    speed: Math.min(Math.max(velocityKms, 11), 72), // clamp between 11-72 km/s
    density: density,
    isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
    absoluteMagnitude: neo.absolute_magnitude_h,
    estimatedDiameterMin: neo.estimated_diameter?.meters?.estimated_diameter_min,
    estimatedDiameterMax: neo.estimated_diameter?.meters?.estimated_diameter_max,
  };
}

/**
 * Get a list of NEOs for the next 7 days, formatted for UI display
 */
export async function getUpcomingNeos() {
  try {
    const start = getTodayDate();
    const end = getDateOffset(7);
    const data = await fetchNeoFeed(start, end);

    const neosList = [];

    // Extract NEOs from all dates
    Object.values(data.near_earth_objects || {}).forEach(dateNeos => {
      dateNeos.forEach(neo => {
        neosList.push(parseNeoForSimulation(neo));
      });
    });

    // Sort by size (largest first)
    neosList.sort((a, b) => b.diameter - a.diameter);

    return neosList;
  } catch (error) {
    console.error('Error getting upcoming NEOs:', error);
    return [];
  }
}
