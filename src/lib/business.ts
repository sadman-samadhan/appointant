// Public facts about the business, copied from the shop's former Setmore page.
// Update here if the shop's details change. Customers are never sent to Setmore;
// `setmoreUrl` is only read server-side for reviews (src/lib/server/setmore.ts).
export const BUSINESS = {
  name: 'B Diamond Barbershop',
  shortName: 'B Diamond',
  about:
    "Step into style at B Diamond Barbershop, where tradition meets trend. Located in the heart of Fredericton, this locally loved spot offers precision cuts, clean shaves, and sharp beard trims in a laid-back, welcoming atmosphere. Whether you're after a classic look or something bold and modern, the skilled barbers at B Diamond deliver with flair and finesse.",
  address: {
    street: '593 King Street, Downtown',
    city: 'Fredericton',
    region: 'New Brunswick',
    postalCode: 'E3B 1E8',
  },
  phone: '+15062307560',
  phoneDisplay: '(506) 230-7560',
  email: 'bdiamond@bd-bs.com',
  facebookUrl: 'https://www.facebook.com/bdiamondbarbershop',
  setmoreUrl: 'https://bdiamond.setmore.com',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=593+King+Street+Fredericton+NB+E3B+1E8',
  currency: 'CAD',
  // Sales tax added to every appointment when it is confirmed (New Brunswick HST).
  taxRate: 0.15,
  taxLabel: 'HST',
  // GST/HST registration number (e.g. 123456789 RT0001), printed on the accountant report.
  hstNumber: '',
  // Monday-first, as shown on the shop's booking page.
  hours: [
    { day: 'Monday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Tuesday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Wednesday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Thursday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Friday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Saturday', open: '9:00 AM', close: '5:30 PM' },
    { day: 'Sunday', open: null, close: null },
  ] as { day: string; open: string | null; close: string | null }[],
};

export const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.region} ${BUSINESS.address.postalCode}`;
