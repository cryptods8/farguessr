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
  stars: number;
}

function rateGuess(
  pair: CountryDistancePair,
  directions: Direction[],
  guessedDistance: number,
  guessedDirectionIndex: number
): GuessRating {
  const correctDistance = pair.distance;
  const difference = Math.abs(correctDistance - guessedDistance);
  const differencePercentage = (difference / correctDistance) * 100;
  let stars =
    differencePercentage < 10
      ? 5
      : differencePercentage < 25
      ? 4
      : differencePercentage < 45
      ? 3
      : differencePercentage < 70
      ? 2
      : 1;
  const correctDirectionIndex = directions.findIndex(
    (d) => d.key === pair.direction
  );
  let directionDifference = Math.abs(
    correctDirectionIndex - guessedDirectionIndex
  );
  if (directionDifference === 3) {
    directionDifference = 1;
  }
  const correctDirection = directions[correctDirectionIndex]!;
  const guessedDirection = directions[guessedDirectionIndex]!;
  stars = Math.max(1, stars - directionDifference * 2);
  return {
    pair,
    correctDistance,
    guessedDistance,
    difference,
    correctDirection,
    guessedDirection,
    stars,
  };
}

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const state = previousFrame.prevState;
  const prevStatus = state?.status;
  const prevType = state?.type;
  const prevRandomKey = state?.randomKey;
  const { inputText, buttonIndex } =
    previousFrame.postBody?.untrustedData || {};
  console.log("info: state is:", state);

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
      newState.randomKey = Math.random().toString(36).substring(2);
    } else {
      newState.type = prevType || "DAILY";
      newState.randomKey =
        prevRandomKey || Math.random().toString(36).substring(2);
    }
    const pair =
      newState.type === "RANDOM"
        ? countries.getRandomPair(newState.randomKey)
        : countries.getPairForToday();
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
          stars,
        } = rateGuess(pair, directions, guessedDistance, guessedDirectionIndex);

        message = (
          <div tw="flex flex-col items-center w-full" style={{ gap: "2rem" }}>
            <div tw="flex flex-row items-center">
              {[...Array(5)].map((_, index) => (
                <div key={`star${index}`} tw="flex text-7xl text-amber-400">
                  {index < stars ? "★" : "☆"}
                </div>
              ))}
            </div>
            <div
              tw="flex flex-row flex-wrap"
              style={{ fontFamily: "TomatoGrotesk" }}
            >
              The distance is {correctDistance.toLocaleString()} km and{" "}
              {correctDirection.key} {correctDirection.emoji}
            </div>
            <div tw="flex flex-row flex-wrap text-4xl">
              You guessed {guessedDistance.toLocaleString()} km (off by{" "}
              {difference.toLocaleString()} km) and {guessedDirection.key}{" "}
              {guessedDirection.emoji}
            </div>
          </div>
        );

        buttons.length = 0;
        buttons.push(<FrameButton key="button1">Play again</FrameButton>);
        const redirectParams = new URLSearchParams();
        redirectParams.append("dist", guessedDistance.toString());
        redirectParams.append("dir", guessedDirection.key);
        redirectParams.append("f", pair.sourceCountryKey);
        redirectParams.append("t", pair.destinationCountryKey);
        const redirectUrl = `${baseUrl}/?${redirectParams.toString()}`;
        buttons.push(
          <FrameButton key="button2" target={redirectUrl} action="link">
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
          <span>{pair.sourceCountry}</span>
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
          <span>{pair.destinationCountry}</span>
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

  // redirectParams.append("dist", guessedDistance.toString());
  // redirectParams.append("dir", guessedDirection.key);
  // redirectParams.append("f", pair.sourceCountryKey);
  // redirectParams.append("t", pair.destinationCountryKey);

  const { dist, dir, f, t } = searchParams as {
    [key: string]: string | undefined;
  };

  let guessRating: GuessRating | null = null;
  if (dist && dir && f && t) {
    const pair = countries.getPairByKeys(f, t);
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
      {guessRating != null && (
        <div
          className="flex flex-col flex-1 gap-6"
          style={{ maxWidth: "512px" }}
        >
          <div className="flex flex-col items-center text-center justify-center w-full text-3xl bg-white rounded py-12 px-8 shadow-lg gap-4">
            <div className="flex flex-row items-center">
              {[...Array(5)].map((_, index) => (
                <div
                  key={`star${index}`}
                  className="flex text-6xl text-amber-400"
                >
                  {index < guessRating!.stars ? "★" : "☆"}
                </div>
              ))}
            </div>
            <div className="flex flex-row flex-wrap font-tomato">
              The distance from {guessRating.pair.sourceCountry} to{" "}
              {guessRating.pair.destinationCountry} is{" "}
              {guessRating.correctDistance.toLocaleString()} km and{" "}
              {guessRating.correctDirection.key}{" "}
              {guessRating.correctDirection.emoji}
            </div>
            <div className="flex flex-row flex-wrap text-base">
              You guessed {guessRating.guessedDistance.toLocaleString()} km (off
              by {guessRating.difference.toLocaleString()} km) and{" "}
              {guessRating.guessedDirection.key}{" "}
              {guessRating.guessedDirection.emoji}
            </div>
          </div>
          <ShareButton
            url={baseUrl}
            text={`Farguessr\n\n${[...Array(5)]
              .map((_, index) => (index < guessRating!.stars ? "★" : "☆"))
              .join("")}\n\n${baseUrl}`}
          />
        </div>
      )}
      <div className="font-inter text-center mt-8 text-sm text-slate-600">
        Farguessr made by{" "}
        <Link href="https://warpcast.com/ds8" className="underline">
          ds8
        </Link>
      </div>
    </div>
  );
}
