import { apiRequest } from '@/lib/api/client';
import { SHOP_CAPACITY } from '@/lib/api/config';
import { toList, todayISO } from '@/lib/format';

// The availability engine offers no time slots for a service without an active capacity
// rule, so every bookable service needs one. Safe to call repeatedly.
export async function ensureCapacityRule(serviceId: string): Promise<void> {
  const rules = toList<any>(await apiRequest<any>(`/api/v1/availability/capacity-rules/service/${serviceId}`), 'rules');
  if (rules.some((r) => r.isActive !== false)) return;
  await apiRequest('/api/v1/availability/capacity-rules', {
    method: 'POST',
    body: JSON.stringify({
      serviceId,
      maxConcurrentBookings: SHOP_CAPACITY,
      bufferTimeMinutes: 0,
      effectiveFrom: todayISO(),
    }),
  });
}
