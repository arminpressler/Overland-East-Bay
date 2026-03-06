/**
 * Web BFF API Client
 * Client for interacting with the Backend-for-Frontend (BFF) API
 * 
 * Target API: https://feature-preview-oauth-dev-ux.website-edge.pages.dev
 * Gemini: created 2026-02-05
 */

class WebBFFClient {
    /**
     * Create a new BFF client instance
     * @param {string} baseUrl - Base URL for the BFF API
     */
    constructor(baseUrl = 'https://feature-preview-oauth-dev-ux.website-edge.pages.dev') {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    }

    /**
     * Make an API request
     * @param {string} endpoint - API endpoint path
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Response data
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        // Default to same-origin credentials (cookies)
        const defaultOptions = {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const fetchOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, fetchOptions);

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                const error = new Error(data.message || `API Error: ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            if (this.onLog) {
                this.onLog({
                    request: {
                        url,
                        method: fetchOptions.method || 'GET',
                        headers: fetchOptions.headers,
                        body: fetchOptions.body
                    },
                    response: {
                        status: response.status,
                        statusText: response.statusText,
                        headers: Object.fromEntries(response.headers.entries()),
                        data
                    }
                });
            }

            return data;
        } catch (error) {
            // Rethrow if it's already our custom error
            if (error.status) throw error;

            // Wrap network/parsing errors
            const wrappedError = new Error(error.message);
            wrappedError.originalError = error;
            throw wrappedError;
        }
    }

    /**
     * Set logging callback
     * @param {Function} callback - Function receiving {request, response}
     */
    setOnLog(callback) {
        this.onLog = callback;
    }

    // ============ SESSION & AUTH ============

    /**
     * Check session status
     * GET /api/session
     */
    async getSession() {
        return this.request('/api/session');
    }

    /**
     * Get current user identity
     * GET /api/me
     */
    async getMe() {
        return this.request('/api/me');
    }

    /**
     * Logout
     * POST /auth/logout
     */
    async logout() {
        return this.request('/auth/logout', {
            method: 'POST'
        });
    }

    // ============ IDENTITY MANAGEMENT ============

    /**
     * Unlink an upstream identity
     * POST /auth/identities/unlink
     */
    async unlinkIdentity(issuer, providerSub) {
        if (!issuer || !providerSub) throw new Error('Issuer and Provider Sub are required');

        return this.request('/auth/identities/unlink', {
            method: 'POST',
            body: JSON.stringify({
                issuer,
                provider_sub: providerSub
            })
        });
    }

    /**
     * Delete account
     * POST /auth/account/delete
     */
    async deleteAccount(confirmText, returnTo) {
        if (confirmText !== 'DELETE') throw new Error('Confirmation text must be DELETE');

        return this.request('/auth/account/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            // Note: Spec says x-www-form-urlencoded for this one in some drafts, 
            // but let's check: "application/x-www-form-urlencoded" is in the YAML.
            // Converting body object to URLSearchParams.
            body: new URLSearchParams({
                confirm: 'true',
                confirm_text: confirmText,
                returnTo: returnTo || ''
            })
        });
    }

    // ============ WIDGETS ============

    /**
     * Get my RSVP for a trip
     * GET /api/widgets/my-rsvp?tripId={tripId}
     */
    async getMyRsvp(tripId) {
        if (!tripId) throw new Error('Trip ID is required');
        return this.request(`/api/widgets/my-rsvp?tripId=${encodeURIComponent(tripId)}`);
    }

    /**
     * Set my RSVP for a trip
     * PUT /api/widgets/my-rsvp?tripId={tripId}
     */
    async setMyRsvp(tripId, status) {
        if (!tripId) throw new Error('Trip ID is required');

        // Spec expects body with required schema
        // checking spec... 
        // Request body for PUT /api/widgets/my-rsvp is SetMyRsvpRequest
        // We assume it takes matching fields e.g., { response: "YES" }
        // Looking at api_interface.js, simpler API uses 'response'.
        // Let's verify spec schemas later if this fails, but for now allow passing raw object or string

        const body = typeof status === 'object' ? status : { response: status };

        return this.request(`/api/widgets/my-rsvp?tripId=${encodeURIComponent(tripId)}`, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
}

// Export to window
window.WebBFFClient = WebBFFClient;
