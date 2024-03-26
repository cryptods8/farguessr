import { NextRequest, NextResponse } from "next/server";

import * as images from "./generate-image";
import * as countries from "../../utils/data-service";
import { verifySignedUrl } from "../../utils/signer";
import { baseUrl } from "../../utils/constants";

function getRequestUrl(req: NextRequest) {
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  return `${baseUrl}${url.pathname}${search ? `?${search}` : ""}`;
}

async function renderImageToRes(image: ArrayBuffer): Promise<NextResponse> {
  const res = new NextResponse(image);
  // Set the content type to PNG and send the response
  res.headers.set("Content-Type", "image/png");
  res.headers.set("Cache-Control", "max-age=10");
  return res;
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
    let imageBuffer: ArrayBuffer;
    if (status === "INITIAL") {
      imageBuffer = await images.generateInitialImage();
    } else if (status === "STARTED") {
      imageBuffer = await images.generateStartedImage(pair!);
    } else if (status === "INVALID") {
      imageBuffer = await images.generateInvalidImage(
        pair!,
        msg ? msg : undefined
      );
    } else if (status === "GUESSED") {
      const direction = directions!.find((d) => d.key === dir)!;
      imageBuffer = await images.generateResultImage(
        pair!,
        directions!,
        parseInt(dist!, 10),
        direction
      );
    } else {
      imageBuffer = await images.generateInitialImage(
        "Invalid image requested :/"
      );
    }

    return renderImageToRes(imageBuffer);
  } catch (e) {
    console.error(e);
    const image = await images.generateInitialImage(
      "Error occured: " + (e as any).message
    );
    return renderImageToRes(image);
  }
}
