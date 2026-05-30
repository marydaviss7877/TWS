import { useParams } from 'react-router-dom';
import { getSubdomainSlug } from '../utils/subdomain';

/**
 * Returns the current tenant slug from:
 * 1. The subdomain (acme.tws.enterprises → 'acme')  — subdomain context
 * 2. React Router :tenantSlug param                  — legacy path-based context
 */
export function useTenantSlug() {
  const params = useParams();
  return getSubdomainSlug() || params.tenantSlug || '';
}
