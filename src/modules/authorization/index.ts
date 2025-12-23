// Authorization System Exports
// "System Odpowiedzialności i Rozliczalności Firmy"

// Components
export { AuthorizationExplainer } from './components/AuthorizationExplainer';
export { CompanyReadinessScore } from './components/CompanyReadinessScore';
export { AuthorizationStatusBadge } from './components/AuthorizationStatusBadge';
export { AuthorizationBlockingAlert } from './components/AuthorizationBlockingAlert';

// Hooks
export {
  useAuthorizationCheck,
  useAuthorizations,
  useAuthorization,
  useRecordAuthorizationCheck,
  useAuthorizationChecks,
  validateAuthorization,
  showAuthorizationError,
  showAuthorizationWarning,
} from './hooks/useAuthorization';

export { useSidebarAuthStatus } from './hooks/useSidebarAuthStatus';

// Repository
export {
  getAuthorizations,
  getAuthorization,
  createAuthorization,
  updateAuthorizationStatus,
  checkAuthorization,
  recordAuthorizationCheck,
  getAuthorizationChecks,
  updateExpiredAuthorizations,
  getExpiringSoonAuthorizations,
  getCompanyReadinessMetrics,
} from './data/authorizationRepository';

// Types
export type {
  Authorization,
  AuthorizationScope,
  AuthorizationCheck,
  CreateAuthorizationInput,
} from './data/authorizationRepository';
