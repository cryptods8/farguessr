import fs from "fs";
import path from "path";
import { SatoriOptions, Font } from "satori";
import { ImageAspectRatio } from "frames.js";

const readFont = (name: string) => {
  return fs.readFileSync(path.resolve(`./public/${name}`));
};

export const fonts: Font[] = [
  {
    name: "Inter",
    data: readFont("Inter-Regular.ttf"),
    weight: 400,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Medium.ttf"),
    weight: 500,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-SemiBold.ttf"),
    weight: 600,
    style: "normal",
  },
  {
    name: "Inter",
    data: readFont("Inter-Bold.ttf"),
    weight: 700,
    style: "normal",
  },
  {
    name: "TomatoGrotesk",
    data: readFont("TomatoGrotesk-SemiBold.otf"),
    weight: 600,
    style: "normal",
  },
];

export const colors = {
  green: "#70cc95",
  greenLight: "#96daaf",
  salmon: "#f7917f",
  salmonLight: "#fbc9c5",
  primary: {
    50: "#F6F5F7",
    100: "#F6F2FC",
    200: "#EEE6F9",
    300: "#E5D9F5",
    400: "#DDCDF2",
    500: "#D4C0EF",
    600: "#9383A3",
    700: "#816E94",
    800: "#6F5985",
    900: "#5D4575",
    950: "#4B3066",
    primary: "#432b64",
    primaryLight: "#cdaddc",
    primaryButton: "#824C9D",
  },
  gray: {
    50: "#FBFDFE",
    75: "#F9FAFB",
    100: "#EBEEF1",
    200: "#E4E9EF",
    300: "#C9D2DE",
    400: "#97A6BA",
    500: "#64748B",
    600: "#475569",
    700: "#364152",
    800: "#252F3F",
    900: "#101828",
  },
};

export const tailwindConfig = {
  theme: {
    extend: {
      colors,
    },
  },
};

export function getOptions(
  options: Partial<SatoriOptions>,
  aspectRatio: ImageAspectRatio | undefined
): SatoriOptions {
  const actualRatio: ImageAspectRatio = aspectRatio ?? "1.91:1";
  return {
    fonts,
    tailwindConfig,
    width: 1200,
    height: actualRatio === "1:1" ? 1200 : 628,
    ...options,
  };
}
