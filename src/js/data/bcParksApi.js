// Live integration with the official BC Parks Data API.
//
// Source: https://bcparks.api.gov.bc.ca/graphql  (open REST + GraphQL service)
// Licence: Open Government Licence – British Columbia. Public read, no API key,
// and it responds with `Access-Control-Allow-Origin: *`, so the web build can
// call it directly (native Capacitor builds are not subject to CORS either).
//
// What this gives us that is REAL: park names, coordinates, camping types
// (frontcountry / backcountry / RV / walk-in / group / etc.), first-come vs
// reservable flags, site counts, and the official booking deep links.
//
// What it does NOT give us: live availability (which dates are open). BC Parks
// exposes no official availability API — that data only lives in the UseDirect
// booking system behind camping.bcparks.ca. So we link users to the live booking
// page rather than inventing availability. (See openspec/changes/
// add-campsite-discovery — the resolved data-source open question.)

const ENDPOINT = 'https://bcparks.api.gov.bc.ca/graphql';

const QUERY = `
  query CampingParks {
    protectedAreas(
      pagination: { limit: 1000 }
      filters: {
        and: [
          { isDisplayed: { eq: true } }
          { parkCampingTypes: { documentId: { notNull: true } } }
        ]
      }
    ) {
      protectedAreaName
      latitude
      longitude
      url
      slug
      parkCampingTypes { campingType { campingTypeName } }
      parkOperation {
        hasReservations
        hasFrontcountryReservations
        hasBackcountryReservations
        hasBackcountryPermits
        hasFirstComeFirstServed
        reservationUrl
        frontcountryReservationUrl
        backcountryReservationUrl
        backcountryPermitUrl
        canoeCircuitReservationUrl
        reservableSites
        nonReservableSites
        frontcountrySites
        backcountrySites
      }
    }
  }
`;

// Camping-type names that indicate front- vs backcountry, used as a fallback
// when the parkOperation reservation flags are not set.
const FRONT_TYPES = new Set([
  'Frontcountry camping',
  'RV-accessible camping',
  'Walk-in camping',
  'Group camping',
  'Yurt',
  'Cabins and huts',
]);
const BACK_TYPES = new Set([
  'Backcountry camping',
  'Wilderness camping',
  'Marine-accessible camping',
  'Boat-accessible camping',
  'Hut',
  'Shelter',
]);

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** Map a raw ProtectedArea node from the API into our campsite shape. */
function normalize(node) {
  const op = node.parkOperation || {};
  const typeNames = (node.parkCampingTypes || [])
    .map((t) => t.campingType && t.campingType.campingTypeName)
    .filter(Boolean);

  const offersFrontcountry =
    op.hasFrontcountryReservations === true ||
    toInt(op.frontcountrySites) > 0 ||
    typeNames.some((t) => FRONT_TYPES.has(t));
  const offersBackcountry =
    op.hasBackcountryReservations === true ||
    op.hasBackcountryPermits === true ||
    toInt(op.backcountrySites) > 0 ||
    typeNames.some((t) => BACK_TYPES.has(t));

  // Prefer a specific booking link; fall back to the park page.
  const reservationUrl =
    op.frontcountryReservationUrl ||
    op.reservationUrl ||
    op.backcountryReservationUrl ||
    op.canoeCircuitReservationUrl ||
    op.backcountryPermitUrl ||
    null;

  const hasCoords =
    typeof node.latitude === 'number' && typeof node.longitude === 'number';

  return {
    id: node.slug || node.protectedAreaName,
    name: node.protectedAreaName,
    coords: hasCoords ? { lat: node.latitude, lng: node.longitude } : null,
    campingTypes: typeNames,
    offersFrontcountry: offersFrontcountry || (!offersBackcountry && true), // default to frontcountry if unknown
    offersBackcountry,
    hasReservations: op.hasReservations === true,
    hasFirstComeFirstServed: op.hasFirstComeFirstServed === true,
    reservableSites: toInt(op.reservableSites),
    nonReservableSites: toInt(op.nonReservableSites),
    reservationUrl,
    parkUrl: node.url || null,
  };
}

/**
 * Fetch all displayed BC Parks that offer camping, normalized to our shape.
 * @returns {Promise<Array>}
 */
export async function fetchCampingParks() {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY }),
  });
  if (!res.ok) {
    throw new Error(`BC Parks API responded ${res.status}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`BC Parks API error: ${json.errors[0]?.message || 'unknown'}`);
  }
  const nodes = json.data?.protectedAreas || [];
  return nodes
    .map(normalize)
    .sort((a, b) => a.name.localeCompare(b.name));
}
