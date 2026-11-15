import "server-only";

/**
 * The two essential cookies of the public borrowing journey (see
 * lib/journeys/cookies.ts for what they hold and how they are set):
 *
 *   br_journey  a random token that finds the draft answers on the server
 *   br_track    the reference and private token of the request being viewed
 */

import { encodeTrackCookie, journeyCookie, requestContext, siteOrigin, trackCookie, type TrackCookie } from "@/lib/journeys/cookies";
import { JOURNEY_TTL_MS } from "./store";

const journey = journeyCookie("br_journey", JOURNEY_TTL_MS);
const track = trackCookie("br_track", 60 * 60);

export { encodeTrackCookie, requestContext, siteOrigin, type TrackCookie };
export const readJourneyToken = journey.read;
export const writeJourneyToken = journey.write;
export const clearJourneyToken = journey.clear;
export const readTrackCookie = track.read;
export const writeTrackCookie = track.write;
export const clearTrackCookie = track.clear;

/** Cookie settings for a route handler that sets the track cookie on its own response. */
export const TRACK_COOKIE_NAME = track.name;
export const trackCookieOptions = track.options;
