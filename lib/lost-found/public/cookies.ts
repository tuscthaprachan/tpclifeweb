import "server-only";

/**
 * The two essential cookies of the public lost and found journeys (see
 * lib/journeys/cookies.ts for what they hold and how they are set):
 *
 *   lf_journey_<kind>  a random token that finds the draft answers on the server
 *   lf_track           the reference and private token of the case being viewed
 */

import { encodeTrackCookie, journeyCookie, requestContext, siteOrigin, trackCookie, type TrackCookie } from "@/lib/journeys/cookies";
import { JOURNEY_TTL_MS } from "./store";
import type { JourneyKind } from "./steps";

const journey = (kind: JourneyKind) => journeyCookie(`lf_journey_${kind}`, JOURNEY_TTL_MS);
const track = trackCookie("lf_track", 60 * 60);

export { encodeTrackCookie, requestContext, siteOrigin, type TrackCookie };
export const readJourneyToken = (kind: JourneyKind) => journey(kind).read();
export const writeJourneyToken = (kind: JourneyKind, token: string) => journey(kind).write(token);
export const clearJourneyToken = (kind: JourneyKind) => journey(kind).clear();
export const readTrackCookie = track.read;
export const writeTrackCookie = track.write;
export const clearTrackCookie = track.clear;

/** Cookie settings for a route handler that sets the track cookie on its own response. */
export const TRACK_COOKIE_NAME = track.name;
export const trackCookieOptions = track.options;
