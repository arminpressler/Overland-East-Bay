/**
 * EBO API Interface
 * Unified client for interacting with the East Bay Overland Trip Planning API
 * 
 * API Specification Reference:
 * documentation/site-content/RSVP api.openapi.yaml
 * 
 * Gemini: created 2026-01-05 - Centralized API client for trip-related endpoints
 */

/**
 * Custom error class for API errors
 * Provides structured error information including HTTP status codes
 */
class EBOApiError extends Error {
    /**
     * Create an API error
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} responseBody - Raw response body text
     */
    constructor(message, statusCode, responseBody) {
        super(message);
        this.name = 'EBOApiError';
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }
}

/**
 * EBO API Client Class
 * Provides methods for interacting with the Trip Planning API
 * Uses singleton pattern via window.eboApi
 */
class EBOApiClient {
    /**
     * Create a new API client instance
     */
    constructor() {
        /** @type {Object|null} Cached configuration object */
        this.config = null;
        /** @type {Promise|null} Pending config fetch promise for deduplication */
        this.configPromise = null;
    }

    // ============ CONFIGURATION ============

    /**
     * Load and cache the API configuration from /config.json
     * Uses promise caching to prevent duplicate fetches
     * @returns {Promise<Object>} Configuration object with apiHost and headers
     */
    async getConfig() {
        // Return cached config if available
        if (this.config) {
            return this.config;
        }

        // Return pending promise if fetch is in progress (prevents duplicate fetches)
        if (!this.configPromise) {
            this.configPromise = fetch('/config.json')
                .then(resp => {
                    if (!resp.ok) {
                        throw new Error(`Config fetch failed: ${resp.status}`);
                    }
                    return resp.json();
                })
                .then(config => {
                    this.config = config;
                    return config;
                })
                .catch(err => {
                    console.warn('EBOApiClient: Could not load config.json, using defaults', err);
                    // Return default config on error
                    this.config = {
                        apiHost: '',
                        headers: { debugSubject: 'dev|armin' }
                    };
                    return this.config;
                });
        }

        return this.configPromise;
    }

    /**
     * Build standard headers for API requests
     * Includes Content-Type, X-Debug-Subject, and any additional headers
     * @param {Object} additionalHeaders - Extra headers to merge
     * @returns {Promise<Object>} Headers object for fetch
     */
    async buildHeaders(additionalHeaders = {}) {
        const config = await this.getConfig();
        return {
            'Content-Type': 'application/json',
            'X-Debug-Subject': config.headers?.debugSubject || 'dev|armin',
            ...additionalHeaders
        };
    }

    // ============ GENERIC REQUEST ============

    /**
     * Make an API request with standard error handling
     * @param {string} endpoint - API endpoint path (relative to apiHost)
     * @param {Object} options - Fetch options (method, body, headers, etc.)
     * @returns {Promise<Object>} Parsed JSON response
     * @throws {EBOApiError} On non-2xx HTTP responses
     */
    async request(endpoint, options = {}) {
        const config = await this.getConfig();
        const url = `${config.apiHost}${endpoint}`;

        // Build headers, merging any provided in options
        const headers = await this.buildHeaders(options.headers || {});

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new EBOApiError(
                `API Error: ${response.status} ${response.statusText}`,
                response.status,
                errorText
            );
        }

        return response.json();
    }

    // ============ TRIP ENDPOINTS ============

    /**
     * Get trip details by ID
     * GET /trips/{tripId}
     * @param {string} tripId - Trip identifier
     * @returns {Promise<Object>} TripDetails object (unwrapped from response)
     */
    async getTrip(tripId) {
        const data = await this.request(`/trips/${tripId}`);
        // API returns { trip: {...} }, unwrap for convenience
        return data.trip || data;
    }

    /**
     * Get RSVP summary for a trip
     * GET /trips/{tripId}/rsvps
     * @param {string} tripId - Trip identifier
     * @returns {Promise<Object>} Response containing rsvpSummary
     */
    async getRsvpSummary(tripId) {
        return this.request(`/trips/${tripId}/rsvps`);
    }

    /**
     * Get current user's RSVP for a trip
     * GET /trips/{tripId}/rsvp/me
     * @param {string} tripId - Trip identifier
     * @returns {Promise<Object>} Response containing myRsvp
     */
    async getMyRsvp(tripId) {
        return this.request(`/trips/${tripId}/rsvp/me`);
    }

    /**
     * Set user's RSVP for a trip
     * PUT /trips/{tripId}/rsvp
     * @param {string} tripId - Trip identifier
     * @param {string} response - RSVP response ('YES' | 'NO' | 'UNSET')
     * @returns {Promise<Object>} Response containing updated myRsvp
     */
    async setMyRsvp(tripId, response) {
        return this.request(`/trips/${tripId}/rsvp`, {
            method: 'PUT',
            headers: {
                'Idempotency-Key': crypto.randomUUID()
            },
            body: JSON.stringify({ response })
        });
    }

    // ============ MEMBER ENDPOINTS ============

    /**
     * Get current user's member profile
     * GET /members/me
     * @returns {Promise<Object>} MemberProfile object (unwrapped from response)
     */
    async getMyProfile() {
        const data = await this.request('/members/me');
        // API returns { member: {...} }, unwrap for convenience
        return data.member || data;
    }

    /**
     * List all members (directory)
     * GET /members
     * @param {boolean} includeInactive - Include inactive members
     * @returns {Promise<Array>} Array of MemberDirectoryEntry objects
     */
    async listMembers(includeInactive = false) {
        const query = includeInactive ? '?includeInactive=true' : '';
        const data = await this.request(`/members${query}`);
        return data.members || [];
    }

    // ============ TRIP LIST ENDPOINTS ============

    /**
     * List visible trips for the authenticated member
     * GET /trips
     * @returns {Promise<Array>} Array of TripSummary objects
     */
    async listTrips() {
        const data = await this.request('/trips');
        return data.trips || [];
    }

    /**
     * List draft trips visible to the authenticated member
     * GET /trips/drafts
     * @returns {Promise<Array>} Array of TripSummary objects
     */
    async listDraftTrips() {
        const data = await this.request('/trips/drafts');
        return data.trips || [];
    }
}

// ============ SINGLETON INSTANCE ============

// Create global singleton instance
// Gemini: changed 2026-01-05 - Singleton pattern for shared API client
if (!window.eboApi) {
    window.eboApi = new EBOApiClient();
}
