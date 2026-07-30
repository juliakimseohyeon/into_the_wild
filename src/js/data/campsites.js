// Campsite data access layer for campsite-discovery.
//
// Real data comes from the official BC Parks Data API (see ./bcParksApi.js).
// The list is fetched once and cached in memory; searches filter that cache so
// there is a single network call per session.
//
// If the API is unreachable (offline, or a locked-down native CSP), we fall
// back to the small snapshot below. These are REAL BC Parks values captured
// from the API — not invented data — just enough to keep the app usable offline.

import { fetchCampingParks } from './bcParksApi.js';

/**
 * @typedef {Object} Campsite
 * @property {string} id
 * @property {string} name
 * @property {{lat:number,lng:number}|null} coords
 * @property {string[]} campingTypes
 * @property {boolean} offersFrontcountry
 * @property {boolean} offersBackcountry
 * @property {boolean} hasReservations
 * @property {boolean} hasFirstComeFirstServed
 * @property {number|null} reservableSites
 * @property {number|null} nonReservableSites
 * @property {string|null} reservationUrl  Official BC Parks booking deep link.
 * @property {string|null} parkUrl         The park's BC Parks page.
 */

/** Offline fallback — real values captured from the BC Parks API. */
const FALLBACK_CAMPSITES = /** @type {Campsite[]} */ ([
  {
    id: 'alice-lake-park',
    name: 'Alice Lake Park',
    coords: { lat: 49.7822, lng: -123.117494 },
    campingTypes: ['Frontcountry camping', 'RV-accessible camping', 'Walk-in camping', 'Group camping'],
    offersFrontcountry: true,
    offersBackcountry: false,
    hasReservations: true,
    hasFirstComeFirstServed: true,
    reservableSites: 97,
    nonReservableSites: 12,
    reservationUrl:
      'https://camping.bcparks.ca/create-booking/results?resourceLocationId=-2147483647&mapId=-2147483648&searchTabGroupId=0&bookingCategoryId=0&nights=1&isReserving=true&equipmentId=-32768&subEquipmentId=-32768&partySize=1',
    parkUrl: 'https://bcparks.ca/alice-lake-park/',
  },
  {
    id: 'golden-ears-park',
    name: 'Golden Ears Park',
    coords: { lat: 49.437, lng: -122.472 },
    campingTypes: ['Frontcountry camping', 'Backcountry camping', 'Group camping', 'RV-accessible camping'],
    offersFrontcountry: true,
    offersBackcountry: true,
    hasReservations: true,
    hasFirstComeFirstServed: true,
    reservableSites: null,
    nonReservableSites: null,
    reservationUrl:
      'https://camping.bcparks.ca/create-booking/results?resourceLocationId=-2147483606&mapId=-2147483576&searchTabGroupId=0&bookingCategoryId=0&nights=1&isReserving=true&equipmentId=-32768&subEquipmentId=-32768&partySize=1',
    parkUrl: 'https://bcparks.ca/golden-ears-park/',
  },
  {
    id: 'garibaldi-park',
    name: 'Garibaldi Park',
    coords: { lat: 49.963373, lng: -122.670368 },
    campingTypes: ['Backcountry camping', 'Wilderness camping', 'Cabins and huts', 'Winter camping'],
    offersFrontcountry: false,
    offersBackcountry: true,
    hasReservations: true,
    hasFirstComeFirstServed: false,
    reservableSites: null,
    nonReservableSites: null,
    reservationUrl: null,
    parkUrl: 'https://bcparks.ca/garibaldi-park/',
  },
  {
    id: 'allison-lake-park',
    name: 'Allison Lake Park',
    coords: { lat: 49.682479, lng: -120.603146 },
    campingTypes: ['Frontcountry camping'],
    offersFrontcountry: true,
    offersBackcountry: false,
    hasReservations: true,
    hasFirstComeFirstServed: true,
    reservableSites: 14,
    nonReservableSites: 8,
    reservationUrl:
      'https://camping.bcparks.ca/create-booking/results?resourceLocationId=-2147483497&mapId=-2147483306&searchTabGroupId=0&bookingCategoryId=0&nights=1&isReserving=true&equipmentId=-32768&subEquipmentId=-32768&partySize=1',
    parkUrl: 'https://bcparks.ca/allison-lake-park/',
  },
]);

/** @type {Promise<Campsite[]>|null} */
let cache = null;
/** True when the last load fell back to the offline snapshot. */
let usedFallback = false;

/** Load the full campsite list once, caching the promise. */
function loadAll() {
  if (!cache) {
    cache = fetchCampingParks()
      .then((parks) => {
        usedFallback = false;
        return parks;
      })
      .catch((err) => {
        console.warn('BC Parks API unavailable; using offline snapshot.', err);
        usedFallback = true;
        return FALLBACK_CAMPSITES;
      });
  }
  return cache;
}

/** Was the offline fallback used for the currently loaded data? */
export function isUsingFallback() {
  return usedFallback;
}

function norm(s) {
  return (s || '').toLowerCase().trim();
}

/**
 * Search BC Parks camping areas by a location query. Matches the query against
 * the park name and its camping types (plus the words "frontcountry" /
 * "backcountry"). An empty query returns everything (initial browse).
 *
 * @param {string} query
 * @returns {Promise<Campsite[]>}
 */
export async function searchCampsites(query) {
  const all = await loadAll();
  const q = norm(query);
  if (!q) return all.slice();
  return all.filter((c) => {
    const haystack = [
      c.name,
      ...(c.campingTypes || []),
      c.offersFrontcountry ? 'frontcountry' : '',
      c.offersBackcountry ? 'backcountry' : '',
    ]
      .map(norm)
      .join(' ');
    return haystack.includes(q);
  });
}
