import 'server-only';
import { setServerRequester } from '@/lib/api/request';
import { agentRequest } from './shopAgent';

// On the server, the shared shop code (shopBookings, moneyBook) always runs as the shop's
// account. Import this module before calling that code from a server route.
setServerRequester(async (path, options = {}) => {
  const body = typeof options.body === 'string' && options.body ? JSON.parse(options.body) : undefined;
  return agentRequest(String(options.method || 'GET'), path, body);
});
