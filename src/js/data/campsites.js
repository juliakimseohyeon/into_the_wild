// Campsite data access layer for campsite-discovery.
//
// NOTE (see openspec/changes/add-campsite-discovery — open question):
// BC Parks does not publish an open availability API, so the data below is
// hand-authored SAMPLE data used to build and demo the discovery UI. The public
// surface of this module (`searchCampsites`) is intentionally async so a real
// data source (scraper, partner feed, backend endpoint) can be dropped in later
// without changing the UI.

/**
 * @typedef {Object} DateRange
 * @property {string} start ISO date (inclusive), e.g. "2026-08-01"
 * @property {string} end   ISO date (inclusive), e.g. "2026-08-05"
 *
 * @typedef {Object} Campsite
 * @property {string} id                 Stable slug.
 * @property {string} name               Campsite / campground name.
 * @property {string} park               Parent park.
 * @property {string} region             BC region, for search + display.
 * @property {'frontcountry'|'backcountry'} type
 * @property {'reservation-required'|'first-come'} reservationType
 * @property {string} [seasonalNote]     For backcountry sites whose reservation
 *                                       requirement varies by season.
 * @property {DateRange[]} availability  Available ranges; empty = fully booked.
 * @property {string|null} bcParksUrl    Official BC Parks reservation page for
 *                                       this site, or null for first-come sites.
 */

/** @type {Campsite[]} */
const SAMPLE_CAMPSITES = [
  {
    id: 'golden-ears-alouette',
    name: 'Alouette Campground',
    park: 'Golden Ears Provincial Park',
    region: 'Lower Mainland',
    type: 'frontcountry',
    reservationType: 'reservation-required',
    availability: [
      { start: '2026-08-11', end: '2026-08-14' },
      { start: '2026-08-25', end: '2026-08-28' },
    ],
    bcParksUrl: 'https://bcparks.ca/golden-ears-park/',
  },
  {
    id: 'alice-lake',
    name: 'Alice Lake Campground',
    park: 'Alice Lake Provincial Park',
    region: 'Sea-to-Sky',
    type: 'frontcountry',
    reservationType: 'reservation-required',
    availability: [{ start: '2026-08-18', end: '2026-08-20' }],
    bcParksUrl: 'https://bcparks.ca/alice-lake-park/',
  },
  {
    id: 'porteau-cove',
    name: 'Porteau Cove Campground',
    park: 'Porteau Cove Provincial Park',
    region: 'Sea-to-Sky',
    type: 'frontcountry',
    reservationType: 'reservation-required',
    // Fully booked for the period shown — exercises the "unavailable" state.
    availability: [],
    bcParksUrl: 'https://bcparks.ca/porteau-cove-park/',
  },
  {
    id: 'garibaldi-lake',
    name: 'Garibaldi Lake',
    park: 'Garibaldi Provincial Park',
    region: 'Sea-to-Sky',
    type: 'backcountry',
    reservationType: 'reservation-required',
    seasonalNote:
      'Reservation required in peak season; first-come, first-served outside it.',
    availability: [{ start: '2026-08-15', end: '2026-08-17' }],
    bcParksUrl: 'https://bcparks.ca/garibaldi-park/',
  },
  {
    id: 'joffre-lakes',
    name: 'Joffre Lakes (Upper Lake)',
    park: 'Joffre Lakes Provincial Park',
    region: 'Sea-to-Sky',
    type: 'backcountry',
    reservationType: 'reservation-required',
    availability: [{ start: '2026-09-01', end: '2026-09-03' }],
    bcParksUrl: 'https://bcparks.ca/joffre-lakes-park/',
  },
  {
    id: 'berg-lake',
    name: 'Berg Lake Trail',
    park: 'Mount Robson Provincial Park',
    region: 'Cariboo',
    type: 'backcountry',
    reservationType: 'reservation-required',
    seasonalNote:
      'Special launch date: all dates for the season open at once, not on a rolling basis.',
    availability: [{ start: '2026-08-20', end: '2026-08-23' }],
    bcParksUrl: 'https://bcparks.ca/mount-robson-park/',
  },
  {
    id: 'bowron-lake-circuit',
    name: 'Bowron Lake Canoe Circuit',
    park: 'Bowron Lake Provincial Park',
    region: 'Cariboo',
    type: 'backcountry',
    reservationType: 'reservation-required',
    seasonalNote: 'Special launch date for the full canoe circuit.',
    availability: [{ start: '2026-08-29', end: '2026-09-02' }],
    bcParksUrl: 'https://bcparks.ca/bowron-lake-park/',
  },
  {
    id: 'manning-lightning-lake',
    name: 'Lightning Lake Campground',
    park: 'E.C. Manning Provincial Park',
    region: 'Okanagan',
    type: 'frontcountry',
    reservationType: 'reservation-required',
    availability: [{ start: '2026-08-12', end: '2026-08-16' }],
    bcParksUrl: 'https://bcparks.ca/ec-manning-park/',
  },
  {
    id: 'manning-hampton',
    name: 'Hampton Campground',
    park: 'E.C. Manning Provincial Park',
    region: 'Okanagan',
    type: 'frontcountry',
    reservationType: 'first-come',
    availability: [{ start: '2026-08-01', end: '2026-09-30' }],
    bcParksUrl: null,
  },
  {
    id: 'skagit-silvertip',
    name: 'Silvertip Campground',
    park: 'Skagit Valley Provincial Park',
    region: 'Lower Mainland',
    type: 'frontcountry',
    reservationType: 'first-come',
    availability: [{ start: '2026-08-01', end: '2026-09-30' }],
    bcParksUrl: null,
  },
];

/**
 * Normalize a string for case-insensitive matching.
 * @param {string} s
 */
function norm(s) {
  return (s || '').toLowerCase().trim();
}

/**
 * Search BC Parks campsites (frontcountry and backcountry) by a location query.
 *
 * Matches the query against the campsite name, parent park, and region. An
 * empty query returns all campsites (initial browse). Async by design so a real
 * data source can replace the sample data without changing callers.
 *
 * @param {string} query
 * @returns {Promise<Campsite[]>}
 */
export async function searchCampsites(query) {
  const q = norm(query);
  if (!q) {
    return SAMPLE_CAMPSITES.slice();
  }
  return SAMPLE_CAMPSITES.filter((c) =>
    [c.name, c.park, c.region].some((field) => norm(field).includes(q)),
  );
}
