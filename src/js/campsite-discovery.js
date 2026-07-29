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
    'Available ' +
    campsite.availability
      .map((r) => `${formatDate(r.start)} – ${formatDate(r.end)}`)
      .join(' · ')
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
      ? `<a class="reserve" href="${esc(c.bcParksUrl)}" target="_blank" rel="noopener noreferrer">Reserve on BC Parks <span aria-hidden="true">&rarr;</span></a>`
      : '';

  const seasonalNote = c.seasonalNote
    ? `<p class="note">${esc(c.seasonalNote)}</p>`
    : '';

  return `
    <li class="site${fullyBooked ? ' is-booked' : ''}">
      <p class="tags">${esc(typeLabel)} <span class="dot">&middot;</span> ${esc(reservationLabel)}</p>
      <h2 class="site-name">${esc(c.name)}</h2>
      <p class="place">${esc(c.park)}, ${esc(c.region)}</p>
      <p class="avail">${esc(availabilityText(c))}</p>
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
        --ink: #26241f;
        --muted: #79746a;
        --faint: #a49e91;
        --cream: #f6f1e7;
        --hairline: #e4ddcd;
        --serif: Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Times New Roman', serif;
        --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        display: block;
        width: 100%;
        min-height: 100vh;
        background: var(--cream);
        color: var(--ink);
        font-family: var(--serif);
      }

      /* ---- Hero: soft grainy pastel gradient ---- */
      .hero {
        position: relative;
        overflow: hidden;
        padding: 64px 28px 56px;
        text-align: center;
        background:
          radial-gradient(120% 120% at 18% 12%, #e9c9d4 0%, rgba(233,201,212,0) 55%),
          radial-gradient(120% 120% at 85% 20%, #ead2bf 0%, rgba(234,210,191,0) 50%),
          linear-gradient(120deg, #d7cfec 0%, #e6cdda 38%, #cfd4ee 68%, #efd6c4 100%);
      }
      .hero::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0.5;
        mix-blend-mode: soft-light;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
      }
      .wordmark {
        position: relative;
        margin: 0;
        font-family: var(--serif);
        font-weight: 400;
        font-size: clamp(2.6rem, 9vw, 4.2rem);
        line-height: 0.95;
        letter-spacing: 0.01em;
        color: #211f1a;
      }
      .tagline {
        position: relative;
        margin: 18px 0 0;
        font-family: var(--sans);
        font-size: 0.72rem;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: #4a463d;
      }

      /* ---- Search ---- */
      .search {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 18px 24px;
        background: var(--cream);
        border-bottom: 1px solid var(--hairline);
      }
      .search-inner { max-width: 680px; margin: 0 auto; }
      .search input {
        width: 100%;
        box-sizing: border-box;
        padding: 13px 20px;
        font-family: var(--sans);
        font-size: 0.95rem;
        color: var(--ink);
        background: #fffdf8;
        border: 1px solid var(--hairline);
        border-radius: 999px;
        outline: none;
      }
      .search input::placeholder { color: var(--faint); }
      .search input:focus { border-color: #b9b09a; }

      /* ---- Results ---- */
      .status {
        max-width: 680px;
        margin: 0 auto;
        padding: 22px 24px 6px;
        font-family: var(--sans);
        font-size: 0.68rem;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--faint);
      }
      .results {
        list-style: none;
        max-width: 680px;
        margin: 0 auto;
        padding: 6px 24px 72px;
      }
      .site {
        padding: 30px 0;
        border-bottom: 1px solid var(--hairline);
      }
      .site.is-booked { opacity: 0.5; }
      .tags {
        margin: 0 0 10px;
        font-family: var(--sans);
        font-size: 0.66rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .tags .dot { margin: 0 4px; color: var(--faint); }
      .site-name {
        margin: 0;
        font-family: var(--serif);
        font-weight: 400;
        font-size: 1.7rem;
        line-height: 1.15;
      }
      .place {
        margin: 8px 0 0;
        font-family: var(--sans);
        font-size: 0.9rem;
        color: var(--muted);
      }
      .avail {
        margin: 14px 0 0;
        font-size: 1.02rem;
        color: var(--ink);
      }
      .note {
        margin: 10px 0 0;
        font-style: italic;
        font-size: 0.95rem;
        color: var(--muted);
      }
      .reserve {
        display: inline-block;
        margin-top: 18px;
        font-family: var(--sans);
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink);
        text-decoration: none;
        border-bottom: 1px solid var(--ink);
        padding-bottom: 3px;
      }
      .reserve span { transition: margin-left 0.15s ease; }
      .reserve:hover span { margin-left: 4px; }

      .empty {
        max-width: 560px;
        margin: 0 auto;
        padding: 80px 24px;
        text-align: center;
      }
      .empty .mark { font-size: 1.6rem; color: var(--faint); }
      .empty p {
        margin: 18px 0 0;
        font-size: 1.15rem;
        line-height: 1.5;
        color: var(--muted);
      }
    </style>

    <header class="hero">
      <h1 class="wordmark">into the wild</h1>
      <p class="tagline">BC Parks campsite finder</p>
    </header>

    <div class="search">
      <div class="search-inner">
        <input
          id="query"
          type="search"
          placeholder="Search by park, campground, or region"
          autocomplete="off"
          aria-label="Search campsites"
        />
      </div>
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
        this._status.textContent = '';
        this._results.innerHTML = `
          <li class="empty"><p>Something went wrong loading campsites.</p></li>`;
        return;
      }

      const q = (query || '').trim();

      if (campsites.length === 0) {
        this._status.textContent = '';
        this._results.innerHTML = `
          <li class="empty">
            <div class="mark">&mdash;</div>
            <p>No campsites found${q ? ` for &ldquo;${esc(q)}&rdquo;` : ''}.
            Try a park like &ldquo;Garibaldi&rdquo; or a region like &ldquo;Sea-to-Sky&rdquo;.</p>
          </li>`;
        return;
      }

      this._status.textContent = `${campsites.length} campsite${
        campsites.length === 1 ? '' : 's'
      }${q ? ` matching “${q}”` : ''}`;
      this._results.innerHTML = campsites.map(campsiteCardHTML).join('');
    }
  },
);
