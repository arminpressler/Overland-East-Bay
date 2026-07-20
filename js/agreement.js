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
let agreementConfig = {
    signatureEndpoint: 'https://ebo-signature-bff.armin-pressler.workers.dev/signature'
};

// Auto-initialize on load
document.addEventListener("DOMContentLoaded", () => {
    loadAgreementConfig();
    injectAlertBox();
    checkExistingSignature();
    
    // Gemini: changed 2026-07-11 - Auto-open modal if URL query or hash requests it
    if (window.location.search.includes("sign=1") || window.location.hash === "#sign") {
        setTimeout(() => {
            openAgreementModal();
        }, 150);
    }

    // Gemini: changed 2026-07-11 - Wire download buttons via JS to ensure function is defined
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
// Gemini: changed 2026-07-14 - Respect signatureEndpoint from config.json on localhost, fallback to production
async function loadAgreementConfig() {
    try {
        const response = await fetch('/config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config.json: ${response.status}`);
        }
        const data = await response.json();
        agreementConfig.signatureEndpoint = data.signatureEndpoint || 'https://ebo-signature-bff.armin-pressler.workers.dev/signature';
    } catch (e) {
        console.warn("Could not load configurations from config.json, using defaults: ", e);
        agreementConfig.signatureEndpoint = 'https://ebo-signature-bff.armin-pressler.workers.dev/signature';
    }
}



/**
 * Check if the browser already has an agreement cookie or storage item, 
 * and update the buttons to reflect the signed state.
 */
function checkExistingSignature() {
    const signedDate = localStorage.getItem('ebo_agreement_signed');
    const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('ebo_agreement_signed='));
    
    if (signedDate || hasCookie) {
        const displayDate = signedDate ? new Date(signedDate).toLocaleDateString() : 'Yes';
        const signButtons = document.querySelectorAll('.btn-sign-agreement');
        signButtons.forEach(btn => {
            btn.innerHTML = `✓ Agreement Signed (${displayDate})`;
            btn.classList.add('signed');
            btn.style.backgroundColor = '#2b9348';
            btn.style.color = '#ffffff';
        });
    }
}

/**
 * Save the signed state to cookies and local storage
 */
function saveSignedState() {
    // 1. Set Local Storage
    const now = new Date().toISOString();
    localStorage.setItem('ebo_agreement_signed', now);
    
    // 2. Set Cookie (1-year expiration, accessible across paths)
    const expiration = new Date();
    expiration.setFullYear(expiration.getFullYear() + 1);
    document.cookie = `ebo_agreement_signed=true; expires=${expiration.toUTCString()}; path=/; SameSite=Lax`;
    
    // 3. Update buttons visually
    checkExistingSignature();
}

/**
 * Injects a clean, temporary success/error alert overlay to DOM if missing
 */
function injectAlertBox() {
    if (!document.getElementById("agreement-alert")) {
        const alertHtml = `<div id="agreement-alert"></div>`;
        const modal = document.getElementById("agreement-modal");
        if (modal) {
            modal.insertAdjacentHTML("beforeend", alertHtml);
        } else {
            document.body.insertAdjacentHTML("beforeend", alertHtml);
        }
    }
}

/**
 * Open the agreement modal and prefill default values if logged in
 */
function openAgreementModal() {
    const modal = document.getElementById("agreement-modal");
    if (modal) {
        // Clear previous values
        document.getElementById("agreement-form").reset();
        
        // Show HTML5 dialog modal
        modal.showModal();
        
        // Try prefilling with current session context if user is signed in
        prefillMemberData();
    } else {
        console.error("Modal #agreement-modal not found in document.");
    }
}

/**
 * Prefill Name & Email from active EBO user session if available
 */
async function prefillMemberData() {
    try {
        // Check if there is an active session
        if (window.WebBFFClient) {
            const client = new window.WebBFFClient();
            const session = await client.getSession().catch(() => null);
            if (session && session.isAuthenticated) {
                const me = await client.getMe().catch(() => null);
                if (me && me.member) {
                    if (me.member.displayName) {
                        document.getElementById("sig-name").value = me.member.displayName;
                    }
                    if (me.member.email) {
                        document.getElementById("sig-email").value = me.member.email;
                    }
                }
            }
        }
    } catch (err) {
        // Fail silently - user can type details manually
        console.log("Session prefill ignored:", err);
    }
}

/**
 * Close the agreement modal
 */
function closeAgreementModal() {
    const modal = document.getElementById("agreement-modal");
    if (modal) {
        modal.close();
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
 * Collect all browser, system, and network audit metadata
 */
async function collectAuditMetadata() {
    const sessionDetails = await getActiveSessionDetails();
    const cookies = getBrowserCookies();
    
    // Automatically detect environment based on host
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const env = isLocal ? 'local' : 'production';
    
    // Compile rich browser metadata
    return {
        environment: env,
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
        
        const payload = {
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
        
        // Success
        saveSignedState();
        showAlert("Agreement signed and saved successfully!", "success");
        closeAgreementModal();
        
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
async function downloadPDF(
    url = '/artifacts/group-trip-agreement-voluntary-acknowledgment-of-risk.pdf',
    filename = 'Voluntary_Acknowledgment_of_Risk_and_Group_Trip_Agreement.pdf'
) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();

        // 1. Modern File System Access API (Chrome 86+ desktop) — most reliable
        if (window.showSaveFilePicker) {
            const handle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{ description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        }

        // 2. Legacy Edge / IE fallback
        if (window.navigator.msSaveBlob) {
            window.navigator.msSaveBlob(blob, filename);
            return;
        }

        // 3. Final fallback: open in new tab for manual File > Save As
        //    We append #filename to the URL so the tab title shows the right name
        window.open(url + '#' + filename, '_blank');

    } catch (err) {
        // User cancelled the save dialog — not an error
        if (err.name === 'AbortError') return;
        console.error('PDF download failed:', err);
        // Last resort: just open the URL
        window.open(url, '_blank');
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
