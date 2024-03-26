import seedrandom from "seedrandom";
import { getPreciseDistance, getGreatCircleBearing } from "geolib";

import data from "../../data/countries.json";
import { coords, CountryCoords } from "../../data/coords";

const seedSalt = process.env.SEED_SALT || "salt";

export interface CountryDistance {
  country: string;
  countryKey: string;
  dist: number;
  dir: string;
  simpleDir: string;
}

export interface Country {
  name: string;
  key: string;
  data: CountryDistance[];
}

export interface CountryDistancePair {
  sourceCountry: CountryCoords;
  destinationCountry: CountryCoords;
  distance: number;
  direction: string;
  bearing: number;
}

export interface Direction {
  name: string;
  key: string;
  emoji: string;
}

export const allDirections: Direction[] = [
  { name: "West", key: "W", emoji: "◀️" },
  { name: "North", key: "N", emoji: "🔼" },
  { name: "South", key: "S", emoji: "🔽" },
  { name: "East", key: "E", emoji: "▶️" },
  { name: "South West", key: "SW", emoji: "↙️" },
  { name: "North West", key: "NW", emoji: "↖️" },
  { name: "North East", key: "NE", emoji: "↗️" },
  { name: "South East", key: "SE", emoji: "↘️" },
];

export const countries = data as Country[];

export function getPairForToday(): CountryDistancePair {
  const today = new Date().toISOString().split("T")[0]!;
  return getRandomPair(today);
}

function getDirectionFromBearing(bearing: number): string {
  if (bearing >= 337.5 || bearing < 22.5) return "N";
  if (bearing >= 22.5 && bearing < 67.5) return "NE";
  if (bearing >= 67.5 && bearing < 112.5) return "E";
  if (bearing >= 112.5 && bearing < 157.5) return "SE";
  if (bearing >= 157.5 && bearing < 202.5) return "S";
  if (bearing >= 202.5 && bearing < 247.5) return "SW";
  if (bearing >= 247.5 && bearing < 292.5) return "W";
  if (bearing >= 292.5 && bearing < 337.5) return "NW";
  return "N";
}

export function getRandomPair(randomKey: string): CountryDistancePair {
  const rng = seedrandom(seedSalt + "/" + randomKey);

  const srcCoordsIdx = Math.floor(rng() * coords.length);
  const destCoordsIdx =
    (Math.floor(rng() * coords.length - 1) + srcCoordsIdx + 1) % coords.length;

  const srcCoords = coords[srcCoordsIdx]!;
  const destCoords = coords[destCoordsIdx]!;

  const distance = getPreciseDistance(srcCoords, destCoords) / 1000;
  const bearing = getGreatCircleBearing(srcCoords, destCoords);

  const direction = getDirectionFromBearing(bearing);
  return {
    sourceCountry: srcCoords,
    destinationCountry: destCoords,
    distance,
    direction,
    bearing,
  };
}

export function getDirectionsForSimpleDirection(
  simpleDir: string
): Direction[] {
  // either [N, S, E, W] or [NE, NW, SE, SW]
  return allDirections.filter((d) => d.key.length === simpleDir.length);
}
