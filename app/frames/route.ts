import { NextRequest, NextResponse } from "next/server";
import { RedirectHandler, getPreviousFrame } from "frames.js/next/server";

const isProduction = process.env.NODE_ENV === "production";

function toUrl(req: NextRequest) {
  const url = new URL(req.url);
  const protocol = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");

  // ngrok + next.js has x-forwarded-port set to 3000, which is incorrect for https
  const port = isProduction
    ? req.headers.get("x-forwarded-port") || "443"
    : protocol === "https"
    ? "443"
    : req.headers.get("x-forwarded-port") || "80";

  url.protocol = protocol;
  url.host = host || url.host;
  url.port = port;

  return url;
}

/**
 * A function ready made for next.js in order to directly export it, which handles all incoming `POST` requests that apps will trigger when users press buttons in your Frame.
 * It handles all the redirecting for you, correctly, based on the <FrameContainer> props defined by the Frame that triggered the user action.
 * @param req a `NextRequest` object from `next/server` (Next.js app router server components)
 * @returns NextResponse
 */
export async function POST(
  req: NextRequest,
  /** unused, but will most frequently be passed a res: NextResponse object. Should stay in here for easy consumption compatible with next.js */
  res: typeof NextResponse,
  redirectHandler?: RedirectHandler
) {
  const body = await req.json();

  const url = new URL(req.url);
  let newUrl = toUrl(req);
  const isFullUrl =
    url.searchParams.get("p")?.startsWith("http://") ||
    url.searchParams.get("p")?.startsWith("https://");
  if (isFullUrl) newUrl = new URL(url.searchParams.get("p")!);
  else newUrl.pathname = url.searchParams.get("p") || "";

  // decompress from 256 bytes limitation of post_url
  newUrl.searchParams.set("postBody", JSON.stringify(body));
  newUrl.searchParams.set("prevState", url.searchParams.get("s") ?? "");
  newUrl.searchParams.set("prevRedirects", url.searchParams.get("r") ?? "");
  // was used to redirect to the correct page, and is no longer needed.
  newUrl.searchParams.delete("p");
  newUrl.searchParams.delete("s");
  newUrl.searchParams.delete("r");

  const prevFrame = getPreviousFrame(
    Object.fromEntries(url.searchParams.entries())
  );

  // Handle 'post_redirect' buttons with href values
  if (
    prevFrame.postBody?.untrustedData.buttonIndex &&
    prevFrame.prevRedirects?.hasOwnProperty(
      prevFrame.postBody?.untrustedData.buttonIndex
    ) &&
    prevFrame.prevRedirects[prevFrame.postBody?.untrustedData.buttonIndex]
  ) {
    return NextResponse.redirect(
      prevFrame.prevRedirects[
        `${prevFrame.postBody?.untrustedData.buttonIndex}`
      ]!,
      { status: 302 }
    );
  }
  // Handle 'post_redirect' buttons without defined href values
  if (
    prevFrame.postBody?.untrustedData.buttonIndex &&
    prevFrame.prevRedirects?.hasOwnProperty(
      `_${prevFrame.postBody?.untrustedData.buttonIndex}`
    )
  ) {
    if (!redirectHandler) {
      // Error!
      return NextResponse.json(
        {
          message:
            "frames.js: You need to define either an href property on your FrameButton that has a `redirect` prop, or pass a third argument to `POST`",
        },
        {
          status: 500,
          statusText:
            "frames.js: You need to define either an href property on your FrameButton that has a `redirect` prop, or pass a third argument to `POST`",
        }
      );
    }
    const redirectValue = redirectHandler(prevFrame);
    if (redirectValue === undefined) {
      // Error!
      return NextResponse.json(
        {
          message:
            "frames.js: Your framesReducer (Second argument of POST) returned undefined when it needed to return a url",
        },
        {
          status: 500,
          statusText:
            "frames.js: Your framesReducer (Second argument of POST) returned undefined when it needed to return a url",
        }
      );
    }

    return NextResponse.redirect(redirectValue, { status: 302 });
  }

  // handle 'post' buttons
  return NextResponse.redirect(newUrl.toString(), { status: 302 });
}
