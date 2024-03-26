import {
  FrameButton,
  FrameContainer,
  FrameElementType,
  FrameImage,
  FrameInput,
  NextServerPageProps,
  getPreviousFrame,
} from "frames.js/next/server";
import Link from "next/link";

import * as countries from "./utils/data-service";
import { Direction, CountryDistancePair } from "./utils/data-service";
import { getOptions } from "./utils/satori-options";
import { signUrl, verifySignedUrl } from "./utils/signer";

import { ShareButton } from "./share-button";

const baseUrl = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

type Status = "INITIAL" | "STARTED" | "INVALID" | "GUESSED";

type GameType = "DAILY" | "RANDOM";

type State = {
  status: Status;
  type?: GameType;
  randomKey?: string;
};

interface GuessRating {
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

function rateGuess(
  pair: CountryDistancePair,
  directions: Direction[],
  guessedDistance: number,
  guessedDirectionIndex: number
): GuessRating {
  const correctDirectionIndex = directions.findIndex(
    (d) => d.key === pair.direction
  );
  const correctDirection = directions[correctDirectionIndex]!;
  const guessedDirection = directions[guessedDirectionIndex]!;
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

function createStarsString(stars: number) {
  let str = "";
  const fullStars = Math.floor(stars / 2);
  const halfStars = stars % 2 === 1;
  for (let i = 0; i < 5; i++) {
    // ⯪ - doesn't work, it's larger
    str += i < fullStars ? "★" : i === fullStars && halfStars ? "★" : "☆";
  }
  return str;
}

function getRandomKey(type: GameType): string {
  return type === "DAILY"
    ? new Date().toISOString().split("T")[0]!
    : Math.random().toString(36).substring(2);
}

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const state = previousFrame.prevState;
  const prevStatus = state?.status;
  const prevType = state?.type;
  const prevRandomKey = state?.randomKey;
  const { inputText, buttonIndex, fid } =
    previousFrame.postBody?.untrustedData || {};
  console.log("info: state is:", state);
  console.log("info: fid is:", fid);

  const buttons: React.ReactElement<FrameElementType>[] = [];
  let baseImage = null;
  let message = null;
  const newState: State = { status: "INITIAL" };
  if (!prevStatus || prevStatus === "GUESSED") {
    newState.status = "INITIAL";
    baseImage = (
      <div tw="flex flex-col items-center" style={{ gap: "1rem" }}>
        <div tw="flex flex-row flex-wrap">Start the Farguessr</div>
        <div
          tw="flex text-4xl"
          style={{ fontFamily: "Inter", fontWeight: 500 }}
        >
          Guess the distance between 2 countries
        </div>
      </div>
    );
    buttons.push(<FrameButton key="button1">Daily</FrameButton>);
    buttons.push(<FrameButton key="button2">🎲 Random</FrameButton>);
  } else {
    newState.status = "STARTED";
    if (prevStatus === "INITIAL") {
      newState.type = buttonIndex === 1 ? "DAILY" : "RANDOM";
      newState.randomKey = getRandomKey(newState.type);
    } else {
      newState.type = prevType || "DAILY";
      newState.randomKey = prevRandomKey || getRandomKey(newState.type);
    }
    const pair = countries.getRandomPair(newState.randomKey);
    const directions = countries.getDirectionsForSimpleDirection(
      pair.direction
    );
    directions.forEach((direction, index) => {
      buttons.push(
        <FrameButton key={`button${index}`}>
          {`${direction.key} ${direction.emoji}`}
        </FrameButton>
      );
    });
    if (prevStatus === "STARTED" || prevStatus === "INVALID") {
      const cleanInput = (inputText || "").replace(/[\s,\.]+/g, "").trim();
      const guessedDistance = parseInt(cleanInput, 10);
      if (isNaN(guessedDistance) || guessedDistance < 0) {
        newState.status = "INVALID";
        message = <div tw="flex flex-wrap">Invalid input. Guess again!</div>;
      } else {
        newState.status = "GUESSED";
        const guessedDirectionIndex = buttonIndex! - 1;
        const {
          correctDistance,
          difference,
          correctDirection,
          guessedDirection,
          percentage,
          stars,
        } = rateGuess(pair, directions, guessedDistance, guessedDirectionIndex);

        message = (
          <div tw="flex flex-col items-center w-full" style={{ gap: "2rem" }}>
            <div
              tw="flex flex-row items-center text-6xl text-amber-400 font-tomato"
              style={{ fontFamily: "TomatoGrotesk" }}
            >
              {percentage.toFixed(1)}%
            </div>
            <div tw="flex flex-row items-center text-6xl text-amber-400">
              {createStarsString(stars)}
            </div>
            <div
              tw="flex flex-row flex-wrap"
              style={{ fontFamily: "TomatoGrotesk" }}
            >
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

        buttons.length = 0;
        buttons.push(<FrameButton key="button1">Play again</FrameButton>);
        const redirectParams = new URLSearchParams();
        redirectParams.append("dist", guessedDistance.toString());
        redirectParams.append("dir", guessedDirection.key);
        redirectParams.append("rk", newState.randomKey);
        const redirectUrl = `${baseUrl}/?${redirectParams.toString()}`;
        const signedRedirectUrl = signUrl(redirectUrl);
        buttons.push(
          <FrameButton key="button2" target={signedRedirectUrl} action="link">
            Share
          </FrameButton>
        );
      }
    }
    const filler = <div tw="flex flex-1 bg-slate-300 pt-3" />;
    baseImage = (
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

  const aspectRatio = "1.91:1";
  const elements: React.ReactElement<FrameElementType>[] = [
    <FrameImage
      key="image"
      aspectRatio={aspectRatio}
      options={getOptions({}, aspectRatio)}
    >
      <div tw="flex w-full h-full justify-center items-center text-5xl relative">
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
    </FrameImage>,
  ];
  if (newState.status === "STARTED" || newState.status === "INVALID") {
    elements.push(<FrameInput key="input" text="Enter distance in km" />);
  }
  buttons.forEach((button) => elements.push(button));

  const { dist, dir, rk } = searchParams as {
    [key: string]: string | undefined;
  };

  let guessRating: GuessRating | null = null;
  let valid = false;
  if (dist && dir && rk) {
    const params = new URLSearchParams(searchParams as Record<string, string>);
    const fullUrl = `${baseUrl}/?${params.toString()}`;
    try {
      verifySignedUrl(fullUrl);
      valid = true;
    } catch (e) {
      console.error("Invalid signed URL", e);
    }
    const pair = countries.getRandomPair(rk);
    const directions = countries.getDirectionsForSimpleDirection(
      pair.direction
    );
    const guessedDistance = parseInt(dist, 10);
    const guessedDirectionIndex = directions.findIndex((d) => d.key === dir);

    guessRating = rateGuess(
      pair,
      directions,
      guessedDistance,
      guessedDirectionIndex
    );
  }

  return (
    <div className="w-full min-h-dvh bg-gradient-to-b from-slate-300 to-slate-200 flex flex-col items-center justify-center p-8 font-inter">
      <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={newState}
        previousFrame={previousFrame}
      >
        {elements}
      </FrameContainer>
      <div
        className="flex flex-col flex-1 gap-6 w-full items-center justify-center"
        style={{ maxWidth: "512px" }}
      >
        {guessRating != null && valid ? (
          <>
            <div className="flex flex-col items-center text-center justify-center w-full text-3xl bg-white rounded py-12 px-8 shadow-lg gap-4">
              <div className="flex flex-row items-center text-6xl text-amber-400 font-tomato">
                {guessRating.percentage.toFixed(1)}%
              </div>
              <div className="flex flex-row items-center text-5xl text-amber-400">
                {createStarsString(guessRating.stars)}
              </div>
              <div className="flex flex-row flex-wrap font-tomato">
                The distance from {guessRating.pair.sourceCountry.name} to{" "}
                {guessRating.pair.destinationCountry.name} is{" "}
                {guessRating.correctDistance.toLocaleString()} km and{" "}
                {guessRating.correctDirection.key}{" "}
                {guessRating.correctDirection.emoji}
              </div>
              <div className="flex flex-row flex-wrap text-base">
                You guessed {guessRating.guessedDistance.toLocaleString()} km
                and {guessRating.guessedDirection.key}{" "}
                {guessRating.guessedDirection.emoji} (off by{" "}
                {guessRating.difference.toLocaleString()} km)
              </div>
            </div>
            <ShareButton
              url={baseUrl}
              text={`Farguessr ${rk}\n\n${guessRating.percentage.toFixed(
                1
              )}%\n${createStarsString(guessRating.stars)}\n\n${baseUrl}`}
            />
          </>
        ) : (
          <ShareButton url={baseUrl} text={`Farguessr by ds8\n\n${baseUrl}`} />
        )}
      </div>
      <div className="font-inter text-center mt-8 text-sm text-slate-600">
        Farguessr made by{" "}
        <Link href="https://warpcast.com/ds8" className="underline">
          ds8
        </Link>
      </div>
    </div>
  );
}
