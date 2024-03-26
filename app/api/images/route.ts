import { NextRequest } from "next/server";

import * as images from "./generate-image";
import * as countries from "../../utils/data-service";
import { verifySignedUrl } from "../../utils/signer";
import { baseUrl } from "../../utils/constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

function verifyUrl(req: NextRequest) {
  const url = getRequestUrl(req);
  return new URL(verifySignedUrl(url));
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = verifyUrl(req);
    const params = url.searchParams;

    const status = params.get("status");
    const randomKey = params.get("rk");
    const dist = params.get("dist");
    const dir = params.get("dir");
    const msg = params.get("msg");

    const pair = randomKey ? countries.getRandomPair(randomKey) : undefined;
    const directions = pair
      ? countries.getDirectionsForSimpleDirection(pair.direction)
      : undefined;
    if (status === "INITIAL") {
      return images.generateInitialImage();
    }
    if (status === "STARTED") {
      return images.generateStartedImage(pair!);
    }
    if (status === "INVALID") {
      return images.generateInvalidImage(pair!, msg ? msg : undefined);
    }
    if (status === "GUESSED") {
      const direction = directions!.find((d) => d.key === dir)!;
      return images.generateResultImage(
        pair!,
        directions!,
        parseInt(dist!, 10),
        direction
      );
    }
    return images.generateInitialImage("Invalid image requested :/");
  } catch (e) {
    console.error(e);
    return images.generateInitialImage("Error occured: " + (e as any).message);
  }
}
