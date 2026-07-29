import { SplashScreen } from '@capacitor/splash-screen';
import { searchCampsites } from './data/campsites.js';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Format an ISO date ("2026-08-11") as "Aug 11, 2026" without timezone drift. */
function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Render a campsite's availability as human-readable text. */
function availabilityText(campsite) {
  if (campsite.reservationType === 'first-come') {
    return 'First-come, first-served — no reservation needed';
  }
  if (!campsite.availability || campsite.availability.length === 0) {
    return 'Fully booked for the dates shown';
  }
  return (
    'Available: ' +
    campsite.availability
      .map((r) => `${formatDate(r.start)} – ${formatDate(r.end)}`)
      .join(', ')
  );
}

/** Escape text destined for innerHTML. */
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch],
  );
}

function campsiteCardHTML(c) {
  const typeLabel = c.type === 'backcountry' ? 'Backcountry' : 'Frontcountry';
  const reservationLabel =
    c.reservationType === 'reservation-required'
      ? 'Reservation required'
      : 'First-come, first-served';
  const fullyBooked =
    c.reservationType === 'reservation-required' &&
    (!c.availability || c.availability.length === 0);

  // Deep link to the correct BC Parks page only for reservation-required sites.
  const reserveLink =
    c.reservationType === 'reservation-required' && c.bcParksUrl
      ? `<a class="reserve-btn" href="${esc(c.bcParksUrl)}" target="_blank" rel="noopener noreferrer">Reserve on BC Parks →</a>`
      : '';

  const seasonalNote = c.seasonalNote
    ? `<p class="note">${esc(c.seasonalNote)}</p>`
    : '';

  return `
    <li class="card${fullyBooked ? ' is-booked' : ''}">
      <div class="card-head">
        <h3>${esc(c.name)}</h3>
        <div class="badges">
          <span class="badge type-${c.type}">${typeLabel}</span>
          <span class="badge res-${c.reservationType}">${reservationLabel}</span>
        </div>
      </div>
      <p class="place">${esc(c.park)} · ${esc(c.region)}</p>
      <p class="availability">${esc(availabilityText(c))}</p>
      ${seasonalNote}
      ${reserveLink}
    </li>
  `;
}

window.customElements.define(
  'campsite-discovery',
  class extends HTMLElement {
    constructor() {
      super();

      // Hide the splash screen once the discovery UI is constructed. Guarded so
      // the web build (where the splash plugin is a no-op/absent) never throws.
      try {
        SplashScreen.hide();
      } catch (e) {
        /* no native splash screen on this platform */
      }

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `
    <style>
      :host {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
        display: block;
        width: 100%;
        color: #1c2b22;
      }
      header {
        padding: 18px 15px;
        background-color: #2f7d4f;
        color: #fff;
      }
      header h1 {
        margin: 0;
        font-size: 1.2em;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      header p { margin: 4px 0 0; font-size: 0.85em; opacity: 0.9; }
      .search {
        display: flex;
        gap: 8px;
        padding: 15px;
        position: sticky;
        top: 0;
        background: #fff;
        border-bottom: 1px solid #eee;
      }
      .search input {
        flex: 1;
        padding: 10px 12px;
        font-size: 1em;
        border: 1px solid #cfd8d2;
        border-radius: 6px;
      }
      .results { list-style: none; margin: 0; padding: 15px; display: grid; gap: 12px; }
      .card {
        border: 1px solid #e3e8e5;
        border-radius: 8px;
        padding: 14px;
        background: #fff;
      }
      .card.is-booked { opacity: 0.7; }
      .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .card h3 { margin: 0; font-size: 1.05em; }
      .place { margin: 6px 0 0; color: #55665c; font-size: 0.9em; }
      .availability { margin: 8px 0 0; font-size: 0.9em; }
      .note { margin: 6px 0 0; font-size: 0.82em; color: #7a5b00; background: #fff8e1; padding: 6px 8px; border-radius: 5px; }
      .badges { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .badge { font-size: 0.7em; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 7px; border-radius: 999px; white-space: nowrap; }
      .type-frontcountry { background: #e3f0ff; color: #1c5fb0; }
      .type-backcountry { background: #eae1ff; color: #5a3ea8; }
      .res-reservation-required { background: #ffe6e0; color: #b0431c; }
      .res-first-come { background: #e2f5e9; color: #2f7d4f; }
      .reserve-btn {
        display: inline-block;
        margin-top: 12px;
        padding: 9px 12px;
        background-color: #2f7d4f;
        color: #fff;
        font-size: 0.85em;
        border-radius: 6px;
        text-decoration: none;
      }
      .empty { padding: 30px 15px; text-align: center; color: #55665c; }
      .status { padding: 0 15px; font-size: 0.85em; color: #55665c; }
    </style>
    <header>
      <h1>Into The Wild</h1>
      <p>Find available BC Parks campsites — frontcountry &amp; backcountry</p>
    </header>
    <div class="search">
      <input
        id="query"
        type="search"
        placeholder="Search by park, campground, or region…"
        autocomplete="off"
        aria-label="Search campsites"
      />
    </div>
    <p class="status" id="status" role="status" aria-live="polite"></p>
    <ul class="results" id="results"></ul>
      `;
    }

    connectedCallback() {
      this._input = this.shadowRoot.querySelector('#query');
      this._results = this.shadowRoot.querySelector('#results');
      this._status = this.shadowRoot.querySelector('#status');

      // Debounce input so we don't query on every keystroke.
      let timer = null;
      this._input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.runSearch(this._input.value), 180);
      });

      // Initial browse: show everything.
      this.runSearch('');
    }

    async runSearch(query) {
      let campsites;
      try {
        campsites = await searchCampsites(query);
      } catch (e) {
        this._status.textContent = 'Something went wrong loading campsites.';
        this._results.innerHTML = '';
        return;
      }

      const q = (query || '').trim();

      if (campsites.length === 0) {
        this._status.textContent = '';
        this._results.innerHTML = `
          <li class="empty">No campsites found${q ? ` for “${esc(q)}”` : ''}.
          Try a park name like “Garibaldi” or a region like “Sea-to-Sky”.</li>`;
        return;
      }

      this._status.textContent = `${campsites.length} campsite${
        campsites.length === 1 ? '' : 's'
      }${q ? ` matching “${esc(q)}”` : ''}`;
      this._results.innerHTML = campsites.map(campsiteCardHTML).join('');
    }
  },
);
