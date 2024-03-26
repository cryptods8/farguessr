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
    (Math.floor(rng() * (coords.length - 1)) + srcCoordsIdx + 1) %
    coords.length;

  const srcCoords = coords[srcCoordsIdx]!;
  const destCoords = coords[destCoordsIdx]!;

  const distance = Math.round(getPreciseDistance(srcCoords, destCoords) / 1000);
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

export interface GuessRating {
  pair: CountryDistancePair;
  correctDistance: number;
  guessedDistance: number;
  difference: number;
  correctDirection: Direction;
  guessedDirection: Direction;
  percentage: number;
  stars: number;
}

const directions = ["W", "NW", "N", "NE", "E", "SE", "S", "SW"];

function getDirectionDifference(a: Direction, b: Direction): number {
  if (a.key === b.key) {
    return 0;
  }
  const idxDifference = Math.abs(
    directions.indexOf(a.key) - directions.indexOf(b.key)
  );
  return Math.min(idxDifference, 8 - idxDifference) / 2;
}

export function rateGuess(
  pair: CountryDistancePair,
  directions: Direction[],
  guessedDistance: number,
  guessedDirection: Direction
): GuessRating {
  const correctDirection = directions.find((d) => d.key === pair.direction)!;
  const directionDifference = getDirectionDifference(
    correctDirection,
    guessedDirection
  );
  const correctDistance = pair.distance;
  const distanceDifference =
    directionDifference === 0
      ? Math.abs(correctDistance - guessedDistance)
      : directionDifference === 1
      ? Math.sqrt(Math.pow(correctDistance, 2) + Math.pow(guessedDistance, 2))
      : correctDistance + guessedDistance;
  const normalizedDifference = Math.round(distanceDifference) % 40000;
  const difference = Math.min(
    normalizedDifference,
    40000 - normalizedDifference
  );
  const tolerance = 50;
  const toleratedDifference = Math.max(0, difference - tolerance);
  const toleratedDistance = correctDistance * 1.2;
  const differenceRatio = Math.min(1, toleratedDifference / toleratedDistance);
  const differencePercentage = differenceRatio * 100;
  const stars =
    differencePercentage < 5
      ? 10
      : differencePercentage < 10
      ? 9
      : differencePercentage < 20
      ? 8
      : differencePercentage < 30
      ? 7
      : differencePercentage < 40
      ? 6
      : differencePercentage < 50
      ? 5
      : differencePercentage < 60
      ? 4
      : differencePercentage < 70
      ? 3
      : differencePercentage < 80
      ? 2
      : differencePercentage < 90
      ? 1
      : 0;
  return {
    percentage: 100 - differencePercentage,
    pair,
    correctDistance,
    guessedDistance,
    difference,
    correctDirection,
    guessedDirection,
    stars,
  };
}

export function createStarsString(stars: number) {
  let str = "";
  const fullStars = Math.floor(stars / 2);
  const halfStars = stars % 2 === 1;
  for (let i = 0; i < 5; i++) {
    // ⯪ - doesn't work, it's larger
    str += i < fullStars ? "★" : i === fullStars && halfStars ? "★" : "☆";
  }
  return str;
}
