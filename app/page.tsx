import {
  FrameButton,
  FrameContainer,
  FrameImage,
  FrameInput,
  NextServerPageProps,
  getPreviousFrame,
} from "frames.js/next/server";
import { ClientProtocolId } from "frames.js";
import Link from "next/link";
// import { Message } from "@farcaster/hub-nodejs";

import * as countries from "./utils/data-service";
import {
  rateGuess,
  createStarsString,
  GuessRating,
} from "./utils/data-service";
import { signUrl, verifySignedUrl } from "./utils/signer";
import { baseUrl } from "./utils/constants";

import { ShareButton } from "./share-button";

const acceptedProtocols: ClientProtocolId[] = [
  {
    id: "xmtp",
    version: "vNext",
  },
  {
    id: "farcaster",
    version: "vNext",
  },
];

type Status = "INITIAL" | "STARTED" | "INVALID" | "GUESSED";

type GameType = "DAILY" | "RANDOM";

type State = {
  status: Status;
  randomKey?: string;
};

function getRandomKey(type: GameType): string {
  return type === "DAILY"
    ? new Date().toISOString().split("T")[0]!
    : Math.random().toString(36).substring(2);
}

interface FrameInputParams {
  inputText?: string;
  buttonIndex?: number;
  fid?: number;
}

interface FrameParams {
  status: Status;
  randomKey?: string;
  dist?: number;
  dirIndex?: number;
}

function nextFrameParams(
  state: State | null,
  { inputText, buttonIndex, fid }: FrameInputParams
): FrameParams {
  const { status } = state || {};
  console.log("info: fid is:", fid);
  if (status === "INITIAL") {
    const type = buttonIndex === 1 ? "DAILY" : "RANDOM";
    return { status: "STARTED", randomKey: getRandomKey(type) };
  }
  if (status === "STARTED" || status === "INVALID") {
    const cleanInput = (inputText || "").replace(/[\s,\.]+/g, "").trim();
    const guessedDistance = parseInt(cleanInput, 10);
    if (isNaN(guessedDistance) || guessedDistance < 0 || buttonIndex == null) {
      return { ...state, status: "INVALID" };
    }
    return {
      ...state,
      status: "GUESSED",
      dist: guessedDistance,
      dirIndex: buttonIndex - 1,
    };
  }
  return { status: "INITIAL" };
}

// This is a react server component only
export default async function Home({ searchParams }: NextServerPageProps) {
  const previousFrame = getPreviousFrame<State>(searchParams);

  const state = previousFrame.prevState;
  const { inputText, buttonIndex, fid } =
    previousFrame.postBody?.untrustedData || {};
  console.log("info: state is:", state);
  console.log("info: postBody is:", previousFrame.postBody);

  const {
    status,
    randomKey,
    dist: distance,
    dirIndex,
  } = nextFrameParams(state, { inputText, buttonIndex, fid });

  const buttons = [];
  const pair = randomKey ? countries.getRandomPair(randomKey) : null;
  const directions = pair
    ? countries.getDirectionsForSimpleDirection(pair.direction)
    : null;
  const imageParams: Record<string, string> = { status };
  if (randomKey) {
    imageParams.rk = randomKey;
  }
  if (status === "INITIAL") {
    buttons.push(<FrameButton key="button1">Daily</FrameButton>);
    buttons.push(<FrameButton key="button2">🎲 Random</FrameButton>);
  } else if (status === "STARTED" || status === "INVALID") {
    directions!.forEach((direction, index) => {
      buttons.push(
        <FrameButton key={`button${index}`}>
          {`${direction.key} ${direction.emoji}`}
        </FrameButton>
      );
    });
  } else if (status === "GUESSED") {
    buttons.push(<FrameButton key="button1">Play again</FrameButton>);

    const guessedDirection = directions![dirIndex!]!;

    const resultRedirectParams = new URLSearchParams();
    resultRedirectParams.append("dist", distance!.toString());
    resultRedirectParams.append("dir", guessedDirection.key);
    resultRedirectParams.append("rk", randomKey!);
    const resultRedirectUrl = `${baseUrl}/?${resultRedirectParams.toString()}`;
    const signedResultRedirectUrl = signUrl(resultRedirectUrl);
    buttons.push(
      <FrameButton key="button2" target={signedResultRedirectUrl} action="link">
        Results
      </FrameButton>
    );

    // https://warpcast.com/~/compose?text=Hello%20@farcaster!&embeds[]=https://farcaster.xyz
    const guessRating = rateGuess(
      pair!,
      directions!,
      distance!,
      guessedDirection
    );
    const shareRedirectParams = new URLSearchParams();
    const pctgStr = guessRating.percentage.toFixed(1);
    const starsStr = createStarsString(guessRating.stars);
    shareRedirectParams.append(
      "text",
      `Farguessr ${randomKey}\n\n${pctgStr}%\n${starsStr}`
    );
    shareRedirectParams.set("embeds[]", baseUrl);
    const shareRedirectUrl = `https://warpcast.com/~/compose?${shareRedirectParams.toString()}`;
    buttons.push(
      <FrameButton key="button3" target={shareRedirectUrl} action="link">
        Share
      </FrameButton>
    );

    imageParams.dist = distance!.toString();
    imageParams.dir = guessedDirection.key;
  } else {
    imageParams.status = "INVALID";
    imageParams.msg = "Invalid game state :/";
    console.log("error: invalid status", status);
  }

  const imageUrl = `${baseUrl}/api/images?${new URLSearchParams(
    imageParams
  ).toString()}`;
  const elements = [
    <FrameImage key="image" aspectRatio={"1.91:1"} src={signUrl(imageUrl)} />,
  ];
  if (status === "STARTED" || status === "INVALID") {
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
    const guessedDirection = directions.find((d) => d.key === dir)!;

    guessRating = rateGuess(
      pair,
      directions,
      guessedDistance,
      guessedDirection
    );
  }

  return (
    <div className="w-full min-h-dvh bg-gradient-to-b from-slate-300 to-slate-200 flex flex-col items-center justify-center p-8 font-inter">
      <FrameContainer
        postUrl="/frames"
        pathname="/"
        state={{ status, randomKey }}
        previousFrame={previousFrame}
        accepts={acceptedProtocols}
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
