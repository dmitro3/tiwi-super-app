/**
 * Support FAQs API Route
 * 
 * Proxy route that re-exports from the main FAQs route.
 * This provides an alias: /api/v1/support/faqs -> /api/v1/faqs
 */

export { GET, POST, PATCH, DELETE } from '../../faqs/route';
export type { FAQ, FAQsAPIResponse, CreateFAQRequest, UpdateFAQRequest } from '../../faqs/route';
