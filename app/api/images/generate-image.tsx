import { ImageResponse } from "@vercel/og";
import { getOptions } from "../../utils/satori-options";

import {
  Direction,
  CountryDistancePair,
  rateGuess,
  createStarsString,
} from "../../utils/data-service";

function InitialImage() {
  return (
    <div tw="flex flex-col items-center" style={{ gap: "1rem" }}>
      <div tw="flex flex-row flex-wrap">Start the Farguessr</div>
      <div tw="flex text-4xl" style={{ fontFamily: "Inter", fontWeight: 500 }}>
        Guess the distance between 2 countries
      </div>
    </div>
  );
}

function StartedImage({ pair }: { pair: CountryDistancePair }) {
  const filler = <div tw="flex flex-1 bg-slate-300 pt-3" />;
  return (
    <div
      tw="flex flex-col items-start justify-center w-full p-12"
      style={{ gap: "2rem" }}
    >
      <div
        tw="flex w-full text-4xl"
        style={{ fontFamily: "Inter", fontWeight: 500 }}
      >
        Guess the distance and direction from
      </div>
      <div tw="flex flex-row items-center w-full" style={{ gap: "2rem" }}>
        <span>{pair.sourceCountry.name}</span>
        {filler}
      </div>
      <div tw="flex flex-row items-center w-full" style={{ gap: "2rem" }}>
        {filler}
      </div>
      <div tw="flex flex-row items-center w-full" style={{ gap: "2rem" }}>
        {filler}
        <span tw="text-4xl" style={{ fontFamily: "Inter", fontWeight: 500 }}>
          to
        </span>
        {filler}
      </div>
      <div tw="flex flex-row items-center w-full" style={{ gap: "2rem" }}>
        {filler}
      </div>
      <div tw="flex flex-row items-center w-full" style={{ gap: "2rem" }}>
        {filler}
        <span>{pair.destinationCountry.name}</span>
      </div>
    </div>
  );
}

function InvalidInputMessage() {
  return <div tw="flex flex-wrap">Invalid input. Guess again!</div>;
}

function InvalidCustomMessage({ message }: { message: string }) {
  return <div tw="flex flex-wrap">{message}</div>;
}

function ResultMessage({
  pair,
  directions,
  guessedDistance,
  guessedDirection,
}: {
  pair: CountryDistancePair;
  directions: Direction[];
  guessedDistance: number;
  guessedDirection: Direction;
}) {
  const { correctDistance, difference, correctDirection, percentage, stars } =
    rateGuess(pair, directions, guessedDistance, guessedDirection);
  return (
    <div tw="flex flex-col items-center w-full" style={{ gap: "2rem" }}>
      <div
        tw="flex flex-row items-center text-6xl text-amber-400"
        style={{ fontFamily: "TomatoGrotesk" }}
      >
        {percentage.toFixed(1)}%
      </div>
      <div tw="flex flex-row items-center text-6xl text-amber-400">
        {createStarsString(stars)}
      </div>
      <div tw="flex flex-row flex-wrap" style={{ fontFamily: "TomatoGrotesk" }}>
        The distance is {correctDistance.toLocaleString()} km and{" "}
        {correctDirection.key} {correctDirection.emoji}
      </div>
      <div tw="flex flex-row flex-wrap text-4xl">
        You guessed {guessedDistance.toLocaleString()} km and{" "}
        {guessedDirection.key} {guessedDirection.emoji} (off by{" "}
        {difference.toLocaleString()} km)
      </div>
    </div>
  );
}

function ImageLayout({
  baseImage,
  message,
}: {
  baseImage: React.ReactNode;
  message?: React.ReactNode;
}) {
  return (
    <div tw="flex w-full h-full justify-center items-center text-5xl relative bg-white">
      <div tw="flex" style={{ fontFamily: "TomatoGrotesk" }}>
        {baseImage}
      </div>
      {message && (
        <div
          tw="flex text-white items-center justify-center text-center p-12"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(33, 33, 33, 0.72)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

async function toImage(image: React.ReactElement) {
  const response = new ImageResponse(image, getOptions({}, "1.91:1"));
  return await response?.arrayBuffer();
}

export async function generateInitialImage(message?: string) {
  return toImage(
    <ImageLayout
      baseImage={<InitialImage />}
      message={message ? <InvalidCustomMessage message={message} /> : null}
    />
  );
}

export async function generateStartedImage(pair: CountryDistancePair) {
  return toImage(<ImageLayout baseImage={<StartedImage pair={pair} />} />);
}

export async function generateInvalidImage(
  pair: CountryDistancePair,
  customMessage?: string
) {
  return toImage(
    <ImageLayout
      baseImage={<StartedImage pair={pair} />}
      message={
        customMessage ? (
          <InvalidCustomMessage message={customMessage} />
        ) : (
          <InvalidInputMessage />
        )
      }
    />
  );
}

export async function generateResultImage(
  pair: CountryDistancePair,
  directions: Direction[],
  guessedDistance: number,
  guessedDirection: Direction
) {
  return toImage(
    <ImageLayout
      baseImage={<StartedImage pair={pair} />}
      message={
        <ResultMessage
          pair={pair}
          directions={directions}
          guessedDistance={guessedDistance}
          guessedDirection={guessedDirection}
        />
      }
    />
  );
}
