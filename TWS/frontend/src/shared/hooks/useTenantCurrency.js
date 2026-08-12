import { useEffect, useState } from 'react';
import { tenantApiService } from '../services/tenant/tenant-api.service';

/**
 * The org's configured currency (Org Settings → General → Currency), defaulting to 'USD'
 * until the read resolves or if it fails. Any authenticated tenant role can call this —
 * see the /organization/settings/currency route, which is intentionally not settings-admin-gated.
 */
export function useTenantCurrency(tenantSlug) {
  const [currency, setCurrency] = useState('USD');

  useEffect(() => {
    if (!tenantSlug) return;
    let active = true;
    tenantApiService.getTenantCurrency(tenantSlug).then((c) => {
      if (active && c) setCurrency(c);
    });
    return () => { active = false; };
  }, [tenantSlug]);

  return currency;
}
