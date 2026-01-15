/**
 * Support Tutorials API Route
 * 
 * Proxy route that re-exports from the main Tutorials route.
 * This provides an alias: /api/v1/support/tutorials -> /api/v1/tutorials
 */

export { GET, POST, PATCH, DELETE } from '../../tutorials/route';
export type { Tutorial, TutorialsAPIResponse, CreateTutorialRequest, UpdateTutorialRequest } from '../../tutorials/route';
