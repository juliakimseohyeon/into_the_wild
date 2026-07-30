import { SplashScreen } from '@capacitor/splash-screen';
import L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import { searchCampsites, isUsingFallback } from './data/campsites.js';

// Marker colours: parks offering frontcountry camping vs backcountry-only.
const TYPE_COLOR = { frontcountry: '#3f6f9f', backcountry: '#7a4fa3' };

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

/** "Frontcountry · Backcountry" — whichever the park offers. */
function typeTagsOf(c) {
  const tags = [];
  if (c.offersFrontcountry) tags.push('Frontcountry');
  if (c.offersBackcountry) tags.push('Backcountry');
  return tags.length ? tags.join(' · ') : 'Camping';
}

/** Reservation status line built from the real BC Parks flags. */
function reservationTextOf(c) {
  const parts = [];
  if (c.hasReservations) parts.push('Reservable');
  if (c.hasFirstComeFirstServed) parts.push('First-come sites');
  let text = parts.join(' · ') || 'See BC Parks for details';

  const counts = [];
  if (c.reservableSites != null) counts.push(`${c.reservableSites} reservable`);
  if (c.nonReservableSites != null) counts.push(`${c.nonReservableSites} first-come`);
  if (counts.length) text += ` — ${counts.join(', ')} sites`;
  return text;
}

/** Link to the official BC Parks booking page, or the park page as a fallback. */
function linkHTML(c, cls) {
  if (c.reservationUrl) {
    return `<a class="${cls}" href="${esc(c.reservationUrl)}" target="_blank" rel="noopener noreferrer">Reserve on BC Parks <span aria-hidden="true">&rarr;</span></a>`;
  }
  if (c.parkUrl) {
    return `<a class="${cls}" href="${esc(c.parkUrl)}" target="_blank" rel="noopener noreferrer">View on BC Parks <span aria-hidden="true">&rarr;</span></a>`;
  }
  return '';
}

function campsiteCardHTML(c) {
  const types = c.campingTypes && c.campingTypes.length
    ? `<p class="place">${esc(c.campingTypes.join(', '))}</p>`
    : '';
  return `
    <li class="site">
      <p class="tags">${esc(typeTagsOf(c))}</p>
      <h2 class="site-name">${esc(c.name)}</h2>
      ${types}
      <p class="avail">${esc(reservationTextOf(c))}</p>
      ${linkHTML(c, 'reserve')}
    </li>
  `;
}

/** Popup body shown when a map marker is clicked. */
function popupHTML(c) {
  const types = c.campingTypes && c.campingTypes.length
    ? `<p class="pop-place">${esc(c.campingTypes.join(', '))}</p>`
    : '';
  return `
    <div class="pop">
      <p class="pop-tags">${esc(typeTagsOf(c))}</p>
      <h3 class="pop-name">${esc(c.name)}</h3>
      ${types}
      <p class="pop-avail">${esc(reservationTextOf(c))}</p>
      ${linkHTML(c, 'pop-reserve')}
    </div>
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

      this._view = 'list';
      this._campsites = [];
      this._map = null;
      this._markerLayer = null;

      const root = this.attachShadow({ mode: 'open' });

      // Leaflet ships its styles as a stylesheet; inside a shadow root we must
      // inject them here rather than relying on the document head.
      const leafletStyle = document.createElement('style');
      leafletStyle.textContent = leafletCss;
      root.appendChild(leafletStyle);

      const appStyle = document.createElement('style');
      appStyle.textContent = this.styles();
      root.appendChild(appStyle);

      const wrap = document.createElement('div');
      wrap.innerHTML = this.markup();
      root.appendChild(wrap);
    }

    styles() {
      return `
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

      /* ---- Controls: search + view toggle ---- */
      .controls {
        position: sticky;
        top: 0;
        z-index: 2;
        padding: 18px 24px;
        background: var(--cream);
        border-bottom: 1px solid var(--hairline);
      }
      .controls-inner {
        max-width: 680px;
        margin: 0 auto;
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .controls input {
        flex: 1;
        min-width: 0;
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
      .controls input::placeholder { color: var(--faint); }
      .controls input:focus { border-color: #b9b09a; }
      .toggle {
        display: inline-flex;
        border: 1px solid var(--hairline);
        border-radius: 999px;
        background: #fffdf8;
        overflow: hidden;
        flex: none;
      }
      .toggle button {
        appearance: none;
        border: 0;
        background: transparent;
        cursor: pointer;
        padding: 11px 16px;
        font-family: var(--sans);
        font-size: 0.66rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .toggle button[aria-pressed='true'] { background: var(--ink); color: #f6f1e7; }

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
      .results[hidden] { display: none; }
      .site { padding: 30px 0; border-bottom: 1px solid var(--hairline); }
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
      .place { margin: 8px 0 0; font-family: var(--sans); font-size: 0.9rem; color: var(--muted); }
      .avail { margin: 14px 0 0; font-size: 1.02rem; color: var(--ink); }
      .note { margin: 10px 0 0; font-style: italic; font-size: 0.95rem; color: var(--muted); }
      .reserve, .pop-reserve {
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

      .empty { max-width: 560px; margin: 0 auto; padding: 80px 24px; text-align: center; }
      .empty .mark { font-size: 1.6rem; color: var(--faint); }
      .empty p { margin: 18px 0 0; font-size: 1.15rem; line-height: 1.5; color: var(--muted); }

      /* ---- Map view ---- */
      .map-wrap { position: relative; }
      .map-wrap[hidden] { display: none; }
      #map {
        width: 100%;
        height: 72vh;
        min-height: 420px;
        background: #e8e3d7;
      }
      .legend {
        position: absolute;
        left: 16px;
        bottom: 20px;
        z-index: 500;
        background: rgba(255,253,248,0.94);
        border: 1px solid var(--hairline);
        border-radius: 10px;
        padding: 10px 12px;
        font-family: var(--sans);
        font-size: 0.66rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
      }
      .legend .row { display: flex; align-items: center; gap: 8px; }
      .legend .row + .row { margin-top: 6px; }
      .legend .swatch { width: 11px; height: 11px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.12); }

      /* Popup typography inside the Leaflet popup */
      .pop { font-family: var(--serif); color: var(--ink); }
      .pop-tags { margin: 0 0 4px; font-family: var(--sans); font-size: 0.6rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); }
      .pop-name { margin: 0; font-weight: 400; font-size: 1.15rem; }
      .pop-place { margin: 4px 0 0; font-family: var(--sans); font-size: 0.8rem; color: var(--muted); }
      .pop-avail { margin: 8px 0 0; font-size: 0.9rem; }
      .pop-reserve { margin-top: 10px; }
      `;
    }

    markup() {
      return `
    <header class="hero">
      <h1 class="wordmark">into the wild</h1>
      <p class="tagline">BC Parks campsite finder</p>
    </header>

    <div class="controls">
      <div class="controls-inner">
        <input
          id="query"
          type="search"
          placeholder="Search by park or camping type"
          autocomplete="off"
          aria-label="Search campsites"
        />
        <div class="toggle" role="group" aria-label="View">
          <button id="view-list" type="button" aria-pressed="true">List</button>
          <button id="view-map" type="button" aria-pressed="false">Map</button>
        </div>
      </div>
    </div>

    <p class="status" id="status" role="status" aria-live="polite"></p>

    <ul class="results" id="results"></ul>

    <div class="map-wrap" id="map-wrap" hidden>
      <div id="map"></div>
      <div class="legend" aria-hidden="true">
        <div class="row"><span class="swatch" style="background:${TYPE_COLOR.frontcountry}"></span>Frontcountry</div>
        <div class="row"><span class="swatch" style="background:${TYPE_COLOR.backcountry}"></span>Backcountry</div>
      </div>
    </div>
      `;
    }

    connectedCallback() {
      const sr = this.shadowRoot;
      this._input = sr.querySelector('#query');
      this._results = sr.querySelector('#results');
      this._status = sr.querySelector('#status');
      this._mapWrap = sr.querySelector('#map-wrap');
      this._btnList = sr.querySelector('#view-list');
      this._btnMap = sr.querySelector('#view-map');

      let timer = null;
      this._input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => this.runSearch(this._input.value), 180);
      });

      this._btnList.addEventListener('click', () => this.setView('list'));
      this._btnMap.addEventListener('click', () => this.setView('map'));

      this.runSearch('');
    }

    setView(view) {
      if (view === this._view) return;
      this._view = view;
      const isMap = view === 'map';
      this._btnList.setAttribute('aria-pressed', String(!isMap));
      this._btnMap.setAttribute('aria-pressed', String(isMap));
      this._results.hidden = isMap;
      this._mapWrap.hidden = !isMap;
      this.renderActiveView();
    }

    async runSearch(query) {
      if (!this._loaded) this._status.textContent = 'Loading BC Parks…';

      let campsites;
      try {
        campsites = await searchCampsites(query);
      } catch (e) {
        this._status.textContent = '';
        this._campsites = [];
        this._results.innerHTML = `<li class="empty"><p>Something went wrong loading campsites.</p></li>`;
        return;
      }
      this._loaded = true;

      this._campsites = campsites;
      const q = (query || '').trim();
      const offline = isUsingFallback() ? ' · offline snapshot' : '';
      this._status.textContent = campsites.length
        ? `${campsites.length} park${campsites.length === 1 ? '' : 's'}${q ? ` matching “${q}”` : ''}${offline}`
        : '';
      this._lastQuery = q;
      this.renderActiveView();
    }

    renderActiveView() {
      if (this._view === 'map') {
        this.renderMap();
      } else {
        this.renderList();
      }
    }

    renderList() {
      const campsites = this._campsites;
      const q = this._lastQuery || '';
      if (campsites.length === 0) {
        this._results.innerHTML = `
          <li class="empty">
            <div class="mark">&mdash;</div>
            <p>No parks found${q ? ` for &ldquo;${esc(q)}&rdquo;` : ''}.
            Try a park like &ldquo;Garibaldi&rdquo; or a type like &ldquo;backcountry&rdquo;.</p>
          </li>`;
        return;
      }
      this._results.innerHTML = campsites.map(campsiteCardHTML).join('');
    }

    ensureMap() {
      if (this._map) return;
      const el = this.shadowRoot.querySelector('#map');
      this._map = L.map(el, { scrollWheelZoom: true, attributionControl: true })
        .setView([53.5, -123.0], 5); // British Columbia
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(this._map);
      this._markerLayer = L.layerGroup().addTo(this._map);
    }

    renderMap() {
      this.ensureMap();
      // Leaflet must re-measure after the container becomes visible.
      this._map.invalidateSize();

      this._markerLayer.clearLayers();
      const withCoords = this._campsites.filter((c) => c.coords);
      const bounds = [];
      withCoords.forEach((c) => {
        const fillColor = c.offersFrontcountry
          ? TYPE_COLOR.frontcountry
          : TYPE_COLOR.backcountry;
        const marker = L.circleMarker([c.coords.lat, c.coords.lng], {
          radius: 7,
          color: '#ffffff',
          weight: 2,
          fillColor,
          fillOpacity: 0.9,
        }).bindPopup(popupHTML(c));
        marker.addTo(this._markerLayer);
        bounds.push([c.coords.lat, c.coords.lng]);
      });

      if (bounds.length === 1) {
        this._map.setView(bounds[0], 9);
      } else if (bounds.length > 1) {
        this._map.fitBounds(bounds, { padding: [40, 40] });
      }
    }
  },
);
