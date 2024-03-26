import seedrandom from "seedrandom";

import data from "../../data/countries.json";

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
  sourceCountry: string;
  sourceCountryKey: string;
  destinationCountry: string;
  destinationCountryKey: string;
  distance: number;
  direction: string;
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

export function getRandomPair(randomKey: string): CountryDistancePair {
  const rng = seedrandom(seedSalt + "/" + randomKey);
  const sourceCountry = countries[Math.floor(rng() * countries.length)]!;
  const destinationCountry =
    sourceCountry.data[Math.floor(rng() * sourceCountry.data.length)]!;

  return toPair(sourceCountry, destinationCountry);
}

export function getPairByKeys(
  sourceCountryKey: string,
  destinationCountryKey: string
): CountryDistancePair {
  const sourceCountry = countries.find((c) => c.key === sourceCountryKey)!;
  const destinationCountry = sourceCountry.data.find(
    (d) => d.countryKey === destinationCountryKey
  )!;

  return toPair(sourceCountry, destinationCountry);
}

function toPair(src: Country, dest: CountryDistance): CountryDistancePair {
  return {
    sourceCountry: src.name,
    sourceCountryKey: src.key,
    destinationCountry: dest.country,
    destinationCountryKey: dest.countryKey,
    distance: dest.dist,
    direction: dest.simpleDir,
  };
}

export function getDirectionsForSimpleDirection(
  simpleDir: string
): Direction[] {
  return allDirections.filter((d) => d.key.length === simpleDir.length);
}
