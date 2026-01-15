/**
 * Support Live Status API Route
 * 
 * Proxy route that re-exports from the main Live Status route.
 * This provides an alias: /api/v1/support/live-status -> /api/v1/live-status
 */

export { GET, POST, PATCH, DELETE } from '../../live-status/route';
export type { LiveStatus, LiveStatusResponse, CreateLiveStatusRequest, UpdateLiveStatusRequest } from '../../live-status/route';
