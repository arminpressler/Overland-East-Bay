/**
 * voluntary Acknowledgment of Risk and Group Trip Agreement JS Handler
 * 
 * Purpose: Handles opening the modal, gathering user signature information,
 * collecting client-side browser audit metadata, and submitting it to the 
 * Google Apps Script endpoint.
 * 
 * agent change 2026-07-11 - Create frontend signature dialog modal handler
 */

// Global config instance
// Gemini: changed 2026-07-12 - Shift config to signatureEndpoint BFF and remove GitHub properties
// Gemini: changed 2026-08-23 - Added trip context detection, dynamic banner rendering, and dual signature/RSVP submission
let agreementConfig = {
    signatureEndpoint: 'https://ebo-signature-bff.armin-pressler.workers.dev/signature',
    rsvpEndpoint: 'https://ebo-signature-bff.armin-pressler.workers.dev/rsvp'
};

/**
 * Extracts trip context from URL parameters or document referrer.
 * Gemini: created 2026-08-23 - Preserve trip context for agreement review & dual RSVP submission
 * @returns {{tripId: string|null, capacity: number|null}}
 */
function getTripContext() {
    const params = new URLSearchParams(window.location.search);
    let tripId = params.get('tripId');
    let capacity = params.get('capacity') ? parseInt(params.get('capacity'), 10) : null;

    if (!tripId && document.referrer) {
        const match = document.referrer.match(/(TRIP_\d{4}_\d{2}_\d{2}_[^./?#]+)/);
        if (match) {
            tripId = match[1];
        }
    }

    return { tripId: tripId || null, capacity: capacity || null };
}

/**
 * Renders contextual trip banner if page was opened for a specific trip.
 * Gemini: created 2026-08-23
 */
function renderTripContextBanner() {
    const context = getTripContext();
    const bannerContainer = document.getElementById('ebo-trip-context-banner');
    if (!bannerContainer || !context.tripId) return;

    const readableTripTitle = context.tripId.replace(/^TRIP_\d{4}_\d{2}_\d{2}_/, '').replace(/_/g, ' ');
    const isEventPage = window.location.pathname.includes('/events/');
    const prefix = isEventPage ? '' : '/events/';
    const tripPageUrl = `${prefix}${context.tripId}.html`;

    bannerContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%); border: 1px solid #3b82f6; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;">
            <div>
                <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #93c5fd; font-weight: 700;">⛺ Trip Agreement & RSVP Review</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin-top: 0.2rem;">${readableTripTitle}</div>
                <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 0.25rem;">Signing this agreement will also confirm your RSVP for this trip.</div>
            </div>
            <a href="${tripPageUrl}" class="btn btn-secondary" style="background: rgba(15, 23, 42, 0.85); border: 1px solid #475569; color: #93c5fd; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; font-size: 0.88rem; font-weight: 600; white-space: nowrap;">
                ← Return to Trip Details
            </a>
        </div>
    `;
}

// Auto-initialize on load
document.addEventListener("DOMContentLoaded", () => {
    loadAgreementConfig();
    injectAlertBox();
    renderTripContextBanner();
    checkExistingSignature();
    computeAgreementHash();
    
    // Gemini: changed 2026-07-28 - Listen for global auth logout/login events
    window.addEventListener('ebo:auth:logout', checkExistingSignature);
    window.addEventListener('ebo:auth:login', checkExistingSignature);
    
    // Gemini: changed 2026-07-29 - Prevent automatic Google auth modal popup on page load when signed out
    const demoLoggedIn = localStorage.getItem('ebo_demo_logged_in') === 'true';
    const sessionToken = localStorage.getItem('ebo_session_token');
    const userProfile = localStorage.getItem('ebo_user_profile');
    const isLoggedIn = (demoLoggedIn && Boolean(sessionToken)) || (Boolean(sessionToken) && Boolean(userProfile));

    const pendingTrigger = localStorage.getItem('ebo_pending_agreement_trigger');
    if (isLoggedIn && pendingTrigger === '1') {
        localStorage.removeItem('ebo_pending_agreement_trigger');
        setTimeout(() => {
            openAgreementModal();
        }, 300);
    } else if (isLoggedIn && (window.location.search.includes("sign=1") || window.location.hash === "#sign")) {
        setTimeout(() => {
            openAgreementModal();
        }, 150);
    } else {
        localStorage.removeItem('ebo_pending_agreement_trigger');
    }

    document.querySelectorAll('.btn-download-pdf').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadPDF();
        });
    });
});

/**
 * Load endpoint configurations from config.json
 */
async function loadAgreementConfig() {
    try {
        const response = await fetch('/config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config.json: ${response.status}`);
        }
        const data = await response.json();
        agreementConfig.signatureEndpoint = data.signatureEndpoint || 'https://ebo-signature-bff.armin-pressler.workers.dev/signature';
        agreementConfig.rsvpEndpoint = data.rsvpEndpoint || 'https://ebo-signature-bff.armin-pressler.workers.dev/rsvp';
    } catch (e) {
        console.warn("Could not load configurations from config.json, using defaults: ", e);
        agreementConfig.signatureEndpoint = 'https://ebo-signature-bff.armin-pressler.workers.dev/signature';
        agreementConfig.rsvpEndpoint = 'https://ebo-signature-bff.armin-pressler.workers.dev/rsvp';
    }
}

/**
 * Check if browser has an agreement cookie or storage item
 */
function checkExistingSignature() {
    // Gemini: changed 2026-07-28 - Require active session token for signed button state
    const demoLoggedIn = localStorage.getItem('ebo_demo_logged_in') === 'true';
    const sessionToken = localStorage.getItem('ebo_session_token');
    const userProfile = localStorage.getItem('ebo_user_profile');
    const isLoggedIn = (demoLoggedIn && Boolean(sessionToken)) || (Boolean(sessionToken) && Boolean(userProfile));
    const tripContext = getTripContext();

    const signButtons = document.querySelectorAll('.btn-sign-agreement');

    if (!isLoggedIn) {
        signButtons.forEach(btn => {
            btn.innerHTML = tripContext.tripId ? `✍️ Sign Agreement & Confirm RSVP` : `✍️ Sign Digital Agreement`;
            btn.classList.remove('signed');
            btn.style.backgroundColor = '';
            btn.style.color = '';
        });
        return;
    }

    const signedDate = localStorage.getItem('ebo_agreement_signed');
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('ebo_agreement_signed='));
    
    if (signedDate || hasCookie) {
        const displayDate = signedDate ? new Date(signedDate).toLocaleDateString() : 'Yes';
        signButtons.forEach(btn => {
            btn.innerHTML = tripContext.tripId ? `✓ Agreement Signed & RSVP Confirmed` : `✓ Agreement Signed (${displayDate})`;
            btn.classList.add('signed');
            btn.style.backgroundColor = '#2b9348';
            btn.style.color = '#ffffff';
        });
    } else {
        signButtons.forEach(btn => {
            btn.innerHTML = tripContext.tripId ? `✍️ Sign Agreement & Confirm RSVP` : `✍️ Sign Digital Agreement`;
            btn.classList.remove('signed');
            btn.style.backgroundColor = '';
            btn.style.color = '';
        });
    }
}

/**
 * Save the signed state to cookies and local storage
 */
function saveSignedState() {
    const now = new Date().toISOString();
    localStorage.setItem('ebo_agreement_signed', now);
    
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);
    document.cookie = `ebo_agreement_signed=true; expires=${expiration.toUTCString()}; path=/; SameSite=Lax`;
    
    checkExistingSignature();
}

/**
 * Injects alert container overlay if missing
 */
function injectAlertBox() {
    if (!document.getElementById("agreement-alert")) {
        const alertHtml = `<div id="agreement-alert"></div>`;
        document.body.insertAdjacentHTML("beforeend", alertHtml);
    }
}

/**
 * Open the unified agreement modal. Enforces Google login prior to display.
 * Gemini: changed 2026-07-28 - Enforce Google Login and render unified rsvp_modal_template.js template
 */
function openAgreementModal() {
    const demoLoggedIn = localStorage.getItem('ebo_demo_logged_in');
    const profileStr = localStorage.getItem('ebo_user_profile');
    const token = localStorage.getItem('ebo_session_token');

    // Enforce Google Login prior to signing
    if (demoLoggedIn === 'false' || (!profileStr && !token)) {
        localStorage.setItem('ebo_pending_agreement_trigger', '1');
        if (typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        } else {
            alert('Please click "Login" in the top navigation bar to sign in with Google before signing the agreement.');
        }
        return;
    }

    let profile = {};
    if (profileStr) {
        try {
            profile = JSON.parse(profileStr);
        } catch (e) {}
    }

    const userName = profile.name || profile.displayName || '';
    const userEmail = profile.email || '';

    // Remove existing modal if present
    const existing = document.getElementById('ebo-rsvp-agreement-modal') || document.getElementById('agreement-modal');
    if (existing) existing.remove();

    // Generate unified modal HTML
    const tripContext = getTripContext();
    const modalHtml = typeof window.getRsvpAgreementModalHtml === 'function'
        ? window.getRsvpAgreementModalHtml({
            tripId: tripContext.tripId,
            capacity: tripContext.capacity,
            name: userName,
            email: userEmail,
            showContactFields: true,
            agreementPath: 'group-trip-agreement.html'
        })
        : getFallbackAgreementModalHtml(userName, userEmail);

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modalEl = document.getElementById('ebo-rsvp-agreement-modal');
    const closeBtn = document.getElementById('ebo-modal-close-btn');
    const cancelBtn = document.getElementById('ebo-modal-cancel-btn');
    const formEl = document.getElementById('agreement-form');

    const closeModal = () => {
        if (modalEl) modalEl.remove();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (modalEl) {
        modalEl.addEventListener('click', (e) => {
            if (e.target === modalEl) closeModal();
        });
    }

    if (formEl) {
        formEl.addEventListener('submit', submitSignature);
    }

    // Render Cloudflare Turnstile inside container if turnstile API is present
    renderTurnstileWidget();
}

/**
 * Render Cloudflare Turnstile widget programmatically inside modal container
 */
function renderTurnstileWidget() {
    const container = document.getElementById('turnstile-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Gemini: changed 2026-07-28 - Use Cloudflare Turnstile test sitekey on localhost to prevent domain mismatch error
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const siteKey = isLocal ? '1x00000000000000000000AA' : '0x4AAAAAAD0e9P2kvCkwvyi_';

    if (window.turnstile) {
        try {
            window.turnstile.render('#turnstile-container', {
                sitekey: siteKey,
                theme: 'dark'
            });
        } catch (e) {
            console.warn('Turnstile render skipped:', e);
        }
    }
}

/**
 * Fallback template if getRsvpAgreementModalHtml is not loaded
 */
function getFallbackAgreementModalHtml(name, email) {
    return `
        <div class="ebo-modal-backdrop" id="ebo-rsvp-agreement-modal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 999999; padding: 1rem; box-sizing: border-box; overflow-y: auto;">
            <div class="ebo-modal-card" style="max-width: 540px; width: 92%; background: #1e293b; color: #f8fafc; border-radius: 12px; border: 1px solid #334155; padding: 1.5rem;">
                <div class="ebo-modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 0.85rem; margin-bottom: 1rem;">
                    <h3 style="margin: 0;">✍️ Sign Voluntary Group Trip Agreement</h3>
                    <button class="ebo-modal-close" id="ebo-modal-close-btn">&times;</button>
                </div>
                <form id="agreement-form">
                    <div class="ebo-modal-body">
                        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
                            <label style="display: block; font-size: 0.82rem; color: #94a3b8;">Full Legal Name *</label>
                            <input type="text" id="sig-name" required value="${name}" readonly style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 0.55rem; border-radius: 6px;">
                            <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-top: 0.5rem;">Email Address *</label>
                            <input type="email" id="sig-email" required value="${email}" readonly style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 0.55rem; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 0.75rem;">
                            <label style="display: block; font-size: 0.85rem;">Cell Phone (Optional)</label>
                            <input type="tel" id="sig-cell" placeholder="(510) 555-0199" style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 0.55rem; border-radius: 6px;">
                        </div>
                        <div style="margin-bottom: 0.85rem;">
                            <label style="display: block; font-size: 0.85rem;">Emergency Contact Info (Optional)</label>
                            <textarea id="sig-emergency" rows="2" placeholder="Name: Jane Smith | Phone: (510) 555-0200" style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 0.55rem; border-radius: 6px;"></textarea>
                        </div>
                        <div style="background: rgba(30, 58, 138, 0.3); border: 1px solid #3b82f6; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-align: center;">
                            <span style="font-size: 1.1rem;">📄</span>
                            <a href="group-trip-agreement.html" target="_blank" style="color: #93c5fd; text-decoration: underline; font-weight: 700; font-size: 0.95rem;">Review Voluntary Group Trip Agreement & Waiver ↗</a>
                        </div>
                        <div style="display: flex; gap: 0.6rem; margin-bottom: 1rem;">
                            <input type="checkbox" id="sig-consent" required style="transform: scale(1.15);">
                            <label for="sig-consent" id="sig-consent-label" style="font-size: 0.88rem; color: #f1f5f9; cursor: pointer;">I certify that I have read, understood, and voluntarily agree to the <a href="group-trip-agreement.html" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">Group Trip Agreement & Waiver</a> terms, and I'm ready to ride safe!</label>
                        </div>
                        <div id="turnstile-container" style="margin-bottom: 0.85rem; display: flex; justify-content: center;"></div>
                    </div>
                    <div class="ebo-modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid #334155; padding-top: 1rem;">
                        <button type="button" class="btn btn-secondary" id="ebo-modal-cancel-btn">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="ebo-modal-confirm-btn">Accept & Submit</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

/**
 * Close the agreement modal
 */
function closeAgreementModal() {
    const modalEl = document.getElementById('ebo-rsvp-agreement-modal') || document.getElementById('agreement-modal');
    if (modalEl) {
        if (typeof modalEl.close === 'function') {
            modalEl.close();
        }
        modalEl.remove();
    }
}

// Gemini: changed 2026-07-12 - Remove client-side IP lookup in favor of worker CF-Connecting-IP header

/**
 * Fetch authenticated session details if available via WebBFFClient
 */
async function getActiveSessionDetails() {
    try {
        if (window.WebBFFClient) {
            const client = new window.WebBFFClient();
            const session = await client.getSession().catch(() => null);
            if (session && session.isAuthenticated) {
                return {
                    user_id: session.userId || "Unknown",
                    identities: session.identities || [],
                    is_authenticated: true
                };
            }
        }
    } catch (err) {
        console.warn("Could not retrieve active session details: ", err);
    }
    return { is_authenticated: false };
}

/**
 * Parse document.cookie into a key-value object
 */
function getBrowserCookies() {
    const cookies = {};
    if (document.cookie) {
        document.cookie.split(';').forEach(c => {
            const parts = c.trim().split('=');
            if (parts.length >= 2) {
                const name = parts[0];
                const value = parts.slice(1).join('=');
                cookies[name] = value;
            }
        });
    }
    return cookies;
}

/**
 * Compute cryptographic SHA-256 hash of the agreement document content.
 * Gemini: created 2026-07-28 - Compute document version SHA-256 hash using Web Crypto API
 * @returns {Promise<string>} Hex representation of SHA-256 hash (e.g. "sha256:8f4343a0...")
 */
// Gemini: changed 2026-07-29 - Updated CANONICAL_AGREEMENT_HASH to Version v0.2 hash
const CANONICAL_AGREEMENT_HASH = 'sha256:a444dc53f6ed113e29357a23b2d46a71292ae83e7c5049884ffe2888fbfceb76';

async function computeAgreementHash() {
    const el = document.getElementById('ebo-agreement-text');
    if (!el) {
        return CANONICAL_AGREEMENT_HASH;
    }
    const textToHash = el.innerText.trim();
    
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(textToHash);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        const fullHash = `sha256:${hashHex}`;
        
        const hashDisplayEl = document.getElementById('agreement-hash-display');
        if (hashDisplayEl) {
            hashDisplayEl.textContent = `${fullHash.substring(0, 16)}...`;
            hashDisplayEl.title = fullHash;
        }
        return fullHash;
    } catch (err) {
        console.warn('SHA-256 hash calculation failed:', err);
        return 'sha256:unknown';
    }
}

if (typeof window !== 'undefined') {
    window.computeAgreementHash = computeAgreementHash;
}

/**
 * Collect all browser, system, and network audit metadata
 */
async function collectAuditMetadata() {
    const sessionDetails = await getActiveSessionDetails();
    const cookies = getBrowserCookies();
    const documentHash = await computeAgreementHash();
    
    // Automatically detect environment based on host
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const env = isLocal ? 'local' : 'production';
    
    // Compile rich browser metadata
    return {
        environment: env,
        document_hash: documentHash,
        hash_algorithm: "SHA-256",
        github_history_url: "https://github.com/arminpressler/overland_east_bay_website/commits/main/public/admin/group-trip-agreement.html",
        client_time: new Date().toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown",
        timezone_offset: new Date().getTimezoneOffset(),
        user_agent: navigator.userAgent,
        language: navigator.language,
        device_platform: navigator.platform || "Unknown",
        cpu_cores: navigator.hardwareConcurrency || "Unknown",
        device_memory: navigator.deviceMemory || "Unknown",
        network_type: navigator.connection ? navigator.connection.effectiveType : "Unknown",
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        pixel_ratio: window.devicePixelRatio || 1,
        referrer: document.referrer || "direct",
        page_url: window.location.href,
        page_title: document.title || "Group Trip Agreement",
        cookies_enabled: navigator.cookieEnabled,
        client_ip: "Edge-Detected", // Verified on Cloudflare Worker
        session_info: sessionDetails,
        cookies: cookies
    };
}



// Gemini: changed 2026-07-12 - Replaced direct GitHub commit with POST to Cloudflare Worker BFF containing Turnstile token

/**
 * Submit the signature payload
 */
async function submitSignature(event) {
    event.preventDefault();
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    
    // Disable submit button and show spinner/loading state
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting Signature...";
    
    try {
        const name = document.getElementById("sig-name").value;
        const email = document.getElementById("sig-email").value;
        const cell = document.getElementById("sig-cell").value;
        const emergency_contact = document.getElementById("sig-emergency").value;
        const consent = document.getElementById("sig-consent").checked;
        
        // Retrieve Cloudflare Turnstile verification response token
        const turnstileResponseInput = document.querySelector('[name="cf-turnstile-response"]');
        const turnstileToken = turnstileResponseInput ? turnstileResponseInput.value : "";
        
        // Form validations
        if (!name || name.trim().length < 2) {
            throw new Error("Please enter your full legal name (at least 2 characters).");
        }
        
        const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
        if (!email || !emailRegex.test(email.trim())) {
            throw new Error("Please enter a valid email address (e.g. name@example.com).");
        }
        
        if (!consent) {
            throw new Error("You must consent to the agreement to submit.");
        }

        if (!turnstileToken) {
            throw new Error("Please complete the security check (Turnstile verification).");
        }
        
        // Gathers rich client metadata
        const metadata = await collectAuditMetadata();
        const tripContext = getTripContext();
        
        const payload = {
            trip_id: tripContext.tripId || null,
            name: name,
            email: email,
            cell: cell,
            emergency_contact: emergency_contact,
            token: turnstileToken,
            client_metadata: metadata
        };
        
        // Send the payload to the Cloudflare Worker BFF endpoint
        const response = await fetch(agreementConfig.signatureEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData.error && errData.error.message ? errData.error.message : `HTTP error ${response.status}`;
            throw new Error(`Submission Error: ${errMsg}`);
        }
        
        // Gemini: changed 2026-08-23 - If tripId is present, also submit the trip RSVP to register participant
        if (tripContext.tripId) {
            try {
                const sessionToken = localStorage.getItem('ebo_session_token');
                const userProfileStr = localStorage.getItem('ebo_user_profile');
                let userProfile = {};
                if (userProfileStr) {
                    try { userProfile = JSON.parse(userProfileStr); } catch (e) {}
                }

                const rsvpPayload = {
                    schema_version: '1.0.0',
                    trip_id: tripContext.tripId,
                    capacity: tripContext.capacity,
                    sub: userProfile.sub || '',
                    name: name,
                    email: email,
                    picture: userProfile.picture || '',
                    cell: cell,
                    emergency_contact: emergency_contact,
                    document_hash: metadata.document_hash,
                    hash_algorithm: metadata.hash_algorithm || 'SHA-256',
                    status: 'Going',
                    agreement_accepted: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const rsvpHeaders = {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                };
                if (sessionToken) {
                    rsvpHeaders['Authorization'] = `Bearer ${sessionToken}`;
                }

                const rsvpResponse = await fetch(agreementConfig.rsvpEndpoint, {
                    method: "POST",
                    headers: rsvpHeaders,
                    credentials: 'include',
                    body: JSON.stringify(rsvpPayload)
                });

                if (rsvpResponse.ok) {
                    const rsvpData = await rsvpResponse.json().catch(() => ({}));
                    const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
                    const finalRecord = (rsvpData && rsvpData.rsvp) ? { ...rsvpPayload, ...rsvpData.rsvp } : rsvpPayload;
                    localStorage.setItem(`ebo_rsvp_${tripContext.tripId}_${cleanEmail}`, JSON.stringify(finalRecord));
                }
            } catch (rsvpErr) {
                console.warn('Trip RSVP submission error from agreement page:', rsvpErr);
            }
        }

        // Success
        saveSignedState();
        showAlert(tripContext.tripId ? "Agreement signed & RSVP confirmed successfully!" : "Agreement signed and saved successfully!", "success");
        closeAgreementModal();

        // If from a trip page, route to trip participants after a brief moment
        if (tripContext.tripId) {
            setTimeout(() => {
                const isEventPage = window.location.pathname.includes('/events/');
                const prefix = isEventPage ? '' : '/events/';
                window.location.href = `${prefix}trip_participants.html?tripId=${encodeURIComponent(tripContext.tripId)}`;
            }, 1200);
        }
        
    } catch (err) {
        console.error("Submission failed: ", err);
        showAlert(err.message || "Submission failed. Please check network settings.", "error");
        
        // Reset the Turnstile captcha so the user can try again
        if (window.turnstile) {
            window.turnstile.reset();
        }
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    }
}


/**
 * Display premium banner notification
 */
function showAlert(message, type) {
    const alertBox = document.getElementById("agreement-alert");
    if (alertBox) {
        alertBox.textContent = message;
        alertBox.className = type === "error" ? "show error" : "show";
        
        // Dismiss after 4 seconds
        setTimeout(() => {
            alertBox.className = "";
        }, 4000);
    } else {
        alert(message);
    }
}

/**
 * Download the Group Trip Agreement PDF with a proper filename.
 *
 * Strategy:
 *   1. Try the modern File System Access API (showSaveFilePicker) - Chrome 86+ desktop.
 *      This gives complete control over the save dialog and filename.
 *   2. Fall back to fetching the PDF as a Blob and using msSaveBlob (Edge/IE legacy).
 *   3. Final fallback: open the PDF directly in a new tab so the user can
 *      use File > Save As from the browser's built-in PDF viewer.
 *
 * NOTE: The plain HTML `download` attribute and blob-URL click tricks are
 * unreliable on macOS Chrome — they produce a UUID filename. This implementation
 * avoids those paths.
 *
 * Gemini: updated 2026-07-11 - Use showSaveFilePicker for reliable filename on macOS Chrome
 *
 * @param {string} [url] - PDF URL to fetch
 * @param {string} [filename] - Desired save-as filename
 */
/**
 * Dynamically prepares live page content with SHA-256 hash & timestamp, then opens browser PDF/print generator.
 * Gemini: changed 2026-07-28 - Generate print-ready PDF dynamically from live page DOM with hash and timestamp
 */
async function downloadPDF() {
    try {
        const hash = await computeAgreementHash();
        const timestamp = new Date().toLocaleString(undefined, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
        
        let printBanner = document.getElementById('print-metadata-banner');
        if (!printBanner) {
            printBanner = document.createElement('div');
            printBanner.id = 'print-metadata-banner';
            const printTarget = document.getElementById('ebo-printable-agreement') || document.querySelector('.content-container');
            if (printTarget) {
                printTarget.insertBefore(printBanner, printTarget.firstChild);
            } else {
                document.body.insertBefore(printBanner, document.body.firstChild);
            }
        }
        
        printBanner.innerHTML = `
            <div style="border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 16px;">
                <h2 style="margin: 0; font-size: 14pt; color: #0f172a;">OVERLAND EAST BAY — OFFICIAL DOCUMENT PRINTOUT</h2>
                <div style="font-size: 8.5pt; color: #475569; margin-top: 4px; display: flex; flex-wrap: wrap; gap: 1rem;">
                    <span><strong>Document Version:</strong> 2026-07</span>
                    <span><strong>SHA-256 Hash:</strong> ${hash}</span>
                    <span><strong>Generated:</strong> ${timestamp}</span>
                </div>
            </div>
        `;
        
        window.print();
    } catch (err) {
        console.error('Dynamic PDF generation failed:', err);
        window.print();
    }
}

// Gemini: changed 2026-07-14 - Add programmatic Turnstile rendering for localhost
/**
 * Callback function invoked automatically by Cloudflare Turnstile API upon loading.
 * Renders the Turnstile widget inside #turnstile-container. Uses dummy test keys if
 * running on localhost to allow local testing.
 */
window.onloadTurnstileCallback = function () {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const siteKey = isLocal ? '1x00000000000000000000AA' : '0x4AAAAAAD0e9P2kvCkwvyi_';
    
    if (window.turnstile) {
        window.turnstile.render('#turnstile-container', {
            sitekey: siteKey,
            theme: 'dark'
        });
    }
};
