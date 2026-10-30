// The request function the shared shop code (shopBookings, moneyBook) uses. In the browser it
// is the signed-in user's own (apiRequest). A server route that acts for the shop (e.g. a
// barber taking a payment, which the backend only lets the owner do) swaps in the shop's
// account; the browser's version can't run on the server anyway.
import { apiRequest as browserRequest } from './client';

type Requester = typeof browserRequest;

let current: Requester = browserRequest;

export function setServerRequester(requester: Requester) {
  current = requester;
}

export const apiRequest: Requester = (path, options) => current(path, options);
