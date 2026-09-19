/**
 * trip-modules.js
 * Reusable Custom Elements for Overland East Bay trip detail pages:
 * - <bear-country>
 * - <fire-restrictions>
 * - <fishing-license>
 *
 * Gemini: added 2026-09-16 - Reusable trip-page modules (GH Issue #84) agent change
 */

(function () {
    'use strict';

    /**
     * Escape HTML special characters for safe attribute injection
     * @param {string} str 
     * @returns {string}
     */
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Renders Bear Country Warning HTML
     * @param {Object} props 
     * @returns {string}
     */
    function renderBearCountry(props) {
        const species = escapeHtml(props.species || 'black bear');
        const distance = escapeHtml(props.distance || '50');
        const canisterRequired = props.canisterRequired === 'true' || props.canisterRequired === true;
        const notes = escapeHtml(props.notes || '');

        return `
    <div class="callout-warning" style="border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.08);">
        <h3 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>🐻</span> Bear Country Warning
        </h3>
        <p><strong>You're in ${species} country.</strong> Store all food, coolers, trash, and scented items (toothpaste, sunscreen, bug spray, pet food) in a bear-resistant canister or locked inside a hard-sided vehicle, ~${distance} ft from where people sleep. Never leave coolers or food unattended. Pack out all trash or use bear-proof dumpsters.</p>
        ${canisterRequired ? '<p><strong>⚠️ Hard Canister Mandatory:</strong> Approved bear-resistant food containers are strictly required in this area (vehicle storage is not permitted).</p>' : ''}
        ${notes ? `<p class="module-notes" style="margin-bottom: 0;"><em>Note:</em> ${notes}</p>` : ''}
    </div>`;
    }

    /**
     * Renders Fire Restrictions & Permits HTML
     * @param {Object} props 
     * @returns {string}
     */
    function renderFireRestrictions(props) {
        const jurisdiction = escapeHtml(props.jurisdiction || 'California Public Lands');
        const asOf = escapeHtml(props.asOf || '');
        const permitRequired = props.permitRequired !== 'false' && props.permitRequired !== false;
        const permitName = escapeHtml(props.permitName || 'California Campfire Permit');
        const permitUrl = props.permitUrl || 'https://permit.preventwildfiresca.org/';
        const orderUrl = props.orderUrl || '';
        const notes = escapeHtml(props.notes || '');

        return `
    <div class="callout-warning">
        <h3 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>🔥</span> Fire Restrictions & Permits
        </h3>
        ${asOf ? `<p><em>Current as of ${asOf}</em></p>` : ''}
        <p><strong>Fire Restrictions:</strong> This trip travels through <strong>${jurisdiction}</strong>. Under seasonal fire restrictions, wood and charcoal campfires are prohibited outside of designated developed recreation sites (which means open campfires and charcoal fires are NOT allowed at our dispersed camp spots).</p>
        ${permitRequired ? `<p><strong>Permit Required:</strong> A free <strong>${permitName}</strong> is mandatory for operating portable gas, propane, or pressurized liquid-fuel stoves and lanterns with an on/off shutoff valve. Every participant planning to cook must carry a valid permit.</p>` : ''}
        ${notes ? `<p class="module-notes"><em>Note:</em> ${notes}</p>` : ''}
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;">
            ${permitUrl ? `<a href="${escapeHtml(permitUrl)}" class="btn" target="_blank" rel="noopener noreferrer">✍️ Obtain Campfire Permit</a>` : ''}
            ${orderUrl ? `<a href="${escapeHtml(orderUrl)}" class="btn" style="background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3);" target="_blank" rel="noopener noreferrer">🌲 Official Agency Fire Orders</a>` : ''}
        </div>
    </div>`;
    }

    /**
     * Renders Fishing License & Regulations HTML
     * @param {Object} props 
     * @returns {string}
     */
    function renderFishingLicense(props) {
        const state = escapeHtml(props.state || 'CA');
        const agency = escapeHtml(props.agency || 'California Department of Fish and Wildlife (CDFW)');
        const minAge = escapeHtml(props.minAge || '16');
        const rules = escapeHtml(props.rules || 'A valid sport fishing license is required on public inland waters. Use single barbless hooks when practicing catch-and-release, and verify local district bag and size limits before fishing.');
        const licenseUrl = props.licenseUrl || 'https://wildlife.ca.gov/Licensing/Fishing';
        const notes = escapeHtml(props.notes || '');

        return `
    <div class="callout-info">
        <h3 style="margin-top: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>🎣</span> Fishing Regulations & License
        </h3>
        <p><strong>License Requirement:</strong> A valid <strong>${state} Sport Fishing License</strong> from the ${agency} is required for all anglers age ${minAge} and older fishing public inland waters.</p>
        <p>${rules}</p>
        ${notes ? `<p class="module-notes"><em>Local Water Notes:</em> ${notes}</p>` : ''}
        ${licenseUrl ? `<div style="margin-top: 1rem;"><a href="${escapeHtml(licenseUrl)}" class="btn" target="_blank" rel="noopener noreferrer">🎣 Purchase Fishing License Online</a></div>` : ''}
    </div>`;
    }

    // Web Component: <bear-country>
    class BearCountryElement extends HTMLElement {
        connectedCallback() {
            // Only populate if not already pre-rendered statically
            if (this.children.length === 0 || this.innerHTML.trim() === '') {
                this.classList.add('trip-module');
                this.setAttribute('data-module', 'bear-country');
                this.innerHTML = renderBearCountry({
                    species: this.getAttribute('species'),
                    distance: this.getAttribute('distance') || this.getAttribute('distance-ft'),
                    canisterRequired: this.getAttribute('canister-required'),
                    notes: this.getAttribute('notes')
                });
            }
        }
    }

    // Web Component: <fire-restrictions>
    class FireRestrictionsElement extends HTMLElement {
        connectedCallback() {
            // Only populate if not already pre-rendered statically
            if (this.children.length === 0 || this.innerHTML.trim() === '') {
                this.classList.add('trip-module');
                this.setAttribute('data-module', 'fire-restrictions');
                this.innerHTML = renderFireRestrictions({
                    jurisdiction: this.getAttribute('jurisdiction'),
                    asOf: this.getAttribute('as-of') || this.getAttribute('as_of'),
                    permitRequired: this.getAttribute('permit-required'),
                    permitName: this.getAttribute('permit-name'),
                    permitUrl: this.getAttribute('permit-url'),
                    orderUrl: this.getAttribute('order-url'),
                    notes: this.getAttribute('notes')
                });
            }
        }
    }

    // Web Component: <fishing-license>
    class FishingLicenseElement extends HTMLElement {
        connectedCallback() {
            // Only populate if not already pre-rendered statically
            if (this.children.length === 0 || this.innerHTML.trim() === '') {
                this.classList.add('trip-module');
                this.setAttribute('data-module', 'fishing-license');
                this.innerHTML = renderFishingLicense({
                    state: this.getAttribute('state'),
                    agency: this.getAttribute('agency'),
                    minAge: this.getAttribute('min-age'),
                    rules: this.getAttribute('rules'),
                    licenseUrl: this.getAttribute('license-url'),
                    notes: this.getAttribute('notes')
                });
            }
        }
    }

    // Register Custom Elements if supported
    if (typeof window !== 'undefined' && 'customElements' in window) {
        if (!customElements.get('bear-country')) {
            customElements.define('bear-country', BearCountryElement);
        }
        if (!customElements.get('fire-restrictions')) {
            customElements.define('fire-restrictions', FireRestrictionsElement);
        }
        if (!customElements.get('fishing-license')) {
            customElements.define('fishing-license', FishingLicenseElement);
        }
    }

    // Export module renderers for manual DOM manipulation if needed
    window.TripModules = {
        renderBearCountry,
        renderFireRestrictions,
        renderFishingLicense
    };
})();
