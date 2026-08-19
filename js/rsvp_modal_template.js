/**
 * rsvp_modal_template.js
 * Unified template generator function for Group Trip Agreement & RSVP Confirmation Modal.
 *
 * Gemini: created 2026-07-28 - Extracted RSVP modal template into separate reusable file
 * Gemini: changed 2026-07-28 - Unified modal template supporting Google login prefill, optional cell/emergency fields, and standalone agreement signing
 */

/**
 * Returns HTML string for the unified Group Trip Agreement & RSVP Confirmation Modal.
 * 
 * @param {Object|string} options - Configuration object or tripId string for backwards compatibility.
 * @param {string} [options.tripId] - Unique trip identifier (e.g. 'TRIP_2026_09_18_...').
 * @param {string} [options.name] - User full legal name from Google profile.
 * @param {string} [options.email] - User email address from Google profile.
 * @param {boolean} [options.showContactFields=false] - Show cell phone and emergency contact text fields.
 * @param {string} [options.agreementPath='../admin/group-trip-agreement.html'] - Relative URL to Group Trip Agreement.
 * @returns {string} Modal HTML string.
 */
function getRsvpAgreementModalHtml(options = {}) {
    let opts = typeof options === 'string' ? { tripId: options } : options;
    
    const tripId = opts.tripId || '';
    const name = opts.name || '';
    const email = opts.email || '';
    const showContactFields = !!opts.showContactFields;
    const agreementPath = opts.agreementPath || '../admin/group-trip-agreement.html';

    const isTripRsvp = !!tripId;
    const readableTripTitle = tripId ? String(tripId).replace(/^TRIP_\d{4}_\d{2}_\d{2}_/, '').replace(/_/g, ' ') : '';
    
    const modalTitle = isTripRsvp 
        ? '📋 Accept Group Trip Agreement & Confirm RSVP' 
        : '✍️ Sign Voluntary Group Trip Agreement';

    return `
        <div class="ebo-modal-backdrop" id="ebo-rsvp-agreement-modal" style="position: fixed; inset: 0; width: 100vw; height: 100dvh; height: 100vh; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); display: flex; align-items: flex-start; justify-content: center; z-index: 999999; padding: max(20px, env(safe-area-inset-top)) 12px 100px 12px; box-sizing: border-box; overflow-y: auto;">
            <div class="ebo-modal-card" style="position: relative; width: 100%; max-width: 520px; max-height: calc(100dvh - 140px); max-height: calc(100vh - 140px); background: #1e293b; color: #f8fafc; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); padding: 1.15rem; display: flex; flex-direction: column; box-sizing: border-box; overflow: hidden; margin-top: 10px; margin-bottom: 80px;">
                <div class="ebo-modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 0.75rem; margin-bottom: 0.85rem; flex-shrink: 0;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #f8fafc;">${modalTitle}</h3>
                    <button class="ebo-modal-close" id="ebo-modal-close-btn" style="background: none; border: none; font-size: 1.5rem; color: #94a3b8; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
                </div>
                
                <form id="agreement-form" style="margin: 0; display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;">
                    <div class="ebo-modal-body" style="flex: 1; overflow-y: auto; padding-right: 0.35rem; -webkit-overflow-scrolling: touch;">
                        ${isTripRsvp ? `
                        <p style="font-weight: 600; color: #38bdf8; margin-top: 0; margin-bottom: 0.75rem; font-size: 0.95rem;">
                            Adventure: ${readableTripTitle}
                        </p>
                        ` : ''}

                        <!-- Google Account Prefilled Fields -->
                        <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #334155; border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem;">
                            <div style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 0.5rem; font-weight: 600; display: flex; align-items: center; gap: 0.35rem;">
                                <span>🔒 Verified Google Profile</span>
                            </div>
                            
                            <div style="margin-bottom: 0.65rem;">
                                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.2rem;">Full Legal Name *</label>
                                <input type="text" id="sig-name" required value="${name}" placeholder="John Smith" 
                                    style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.92rem;" ${name ? 'readonly' : ''}>
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.82rem; color: #94a3b8; margin-bottom: 0.2rem;">Email Address *</label>
                                <input type="email" id="sig-email" required value="${email}" placeholder="john.smith@example.com" 
                                    style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.92rem;" ${email ? 'readonly' : ''}>
                            </div>
                        </div>

                        <div style="margin-bottom: 0.75rem;">
                            <label style="display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.25rem;">Cell Phone (Optional)</label>
                            <input type="tel" id="sig-cell" placeholder="(510) 555-0199" 
                                style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.9rem;">
                        </div>

                        <div style="margin-bottom: 0.85rem;">
                            <label style="display: block; font-size: 0.85rem; color: #cbd5e1; margin-bottom: 0.25rem;">Emergency Contact Info (Optional)</label>
                            <textarea id="sig-emergency" rows="2" placeholder="Name: Jane Smith | Phone: (510) 555-0200" 
                                style="width: 100%; box-sizing: border-box; background: #0f172a; border: 1px solid #334155; color: #f8fafc; padding: 0.55rem 0.75rem; border-radius: 6px; font-size: 0.9rem; font-family: inherit;"></textarea>
                        </div>

                        <!-- Prominent Agreement Link Banner -->
                        <div style="background: rgba(30, 58, 138, 0.3); border: 1px solid #3b82f6; border-radius: 8px; padding: 0.75rem 0.85rem; margin-bottom: 0.85rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; text-align: center;">
                            <span style="font-size: 1.1rem;">📄</span>
                            <a href="${agreementPath}" target="_blank" style="color: #93c5fd; text-decoration: underline; font-weight: 700; font-size: 0.9rem;">Review Voluntary Group Trip Agreement & Waiver ↗</a>
                        </div>

                        ${isTripRsvp ? `
                        <ul style="padding-left: 1.2rem; margin-top: 0.25rem; margin-bottom: 0.85rem; font-size: 0.85rem; color: #cbd5e1; line-height: 1.45;">
                            <li>Your RSVP details (Name and Profile Picture) will be added to the official participant roster for this trip.</li>
                        </ul>
                        ` : ''}

                        <div style="display: flex; align-items: flex-start; gap: 0.65rem; background: rgba(30, 41, 59, 0.8); border: 1px solid #334155; padding: 0.85rem; border-radius: 8px; margin-bottom: 0.85rem;">
                            <input type="checkbox" id="sig-consent" required style="margin-top: 0.2rem; accent-color: #22c55e; cursor: pointer; transform: scale(1.2);">
                            <label for="sig-consent" id="sig-consent-label" style="font-size: 0.85rem; color: #f1f5f9; cursor: pointer; line-height: 1.45;">
                                I certify that I have read, understood, and voluntarily agree to the <a href="${agreementPath}" target="_blank" style="color: #60a5fa; text-decoration: underline; font-weight: 600;">Group Trip Agreement & Waiver</a> terms, and I'm ready to ride safe!
                            </label>
                        </div>

                        <div id="turnstile-container" style="margin-bottom: 0.75rem; display: flex; justify-content: center;"></div>
                    </div>

                    <div class="ebo-modal-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.75rem; border-top: 1px solid #334155; padding-top: 0.75rem; flex-shrink: 0;">
                        <button type="button" class="btn btn-secondary" id="ebo-modal-cancel-btn" style="background: #334155; color: #ffffff; border: none; padding: 0.6rem 1.1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" id="ebo-modal-confirm-btn" style="background: linear-gradient(135deg, #2b9348 0%, #15803d 100%); color: #ffffff; border: none; padding: 0.6rem 1.35rem; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.9rem;">
                            ${isTripRsvp ? 'I Accept & Confirm RSVP' : 'Accept & Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

if (typeof window !== 'undefined') {
    window.getRsvpAgreementModalHtml = getRsvpAgreementModalHtml;
}
