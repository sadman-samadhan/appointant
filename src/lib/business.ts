// Public facts about the business, from the shop's own booking site
// (https://ambarbershop.barberly.app). Update here if the shop's details change.
export const BUSINESS = {
  name: 'AM Barbershop',
  shortName: 'AM',
  about:
    'AM Barbershop on York Street is a Fredericton favourite: sharp fades, textured cuts, hot towel shaves and the signature AM Treatment, in a black-and-gold shop where walk-ins are welcome. Child friendly, wheelchair accessible, with student and senior discounts.',
  address: {
    street: '80 York Street',
    city: 'Fredericton',
    region: 'New Brunswick',
    postalCode: 'E3B 3N5',
  },
  phone: '+15062625539',
  phoneDisplay: '(506) 262-5539',
  // Left empty until the shop gives us one; empty values are hidden on the site.
  email: '',
  facebookUrl: '',
  // No Setmore page for this shop: reviews and the fallback menu come from below.
  setmoreUrl: '',
  bookingSiteUrl: 'https://ambarbershop.barberly.app',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=80+York+Street+Fredericton+NB+E3B+3N5',
  // Rating shown on the shop's booking site.
  rating: { average: 4.9, count: 367 },
  currency: 'CAD',
  // Sales tax added to every appointment when it is confirmed (New Brunswick HST).
  taxRate: 0.15,
  taxLabel: 'HST',
  // GST/HST registration number (e.g. 123456789 RT0001), printed on the accountant report.
  hstNumber: '',
  // Monday-first. Sunday isn't listed on the shop's site, so it shows as closed.
  hours: [
    { day: 'Monday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Tuesday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Wednesday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Thursday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Friday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Saturday', open: '9:00 AM', close: '7:00 PM' },
    { day: 'Sunday', open: null, close: null },
  ] as { day: string; open: string | null; close: string | null }[],
  // The shop's menu, shown on the homepage until services are published in the salon system.
  menu: [
    { name: 'AM Treatment', minutes: 75, price: 120, description: 'Haircut, shaving or beard trim, face massage, scalp massage and shampoo condition.' },
    { name: 'Luxury Shaving', minutes: 50, price: 65, description: 'A full luxury shave with hot towels, for a face shave you will want again.' },
    { name: 'Wolf Cut', minutes: 60, price: 65, description: 'Soft, choppy layers with face-framing pieces.' },
    { name: 'Haircut & Shaving', minutes: 45, price: 52, description: 'A full haircut finished with a clean shave.' },
    { name: 'Haircut & Beard Trim', minutes: 45, price: 50, description: 'A full haircut with a shaped and lined beard.' },
    { name: 'Head Shave & Beard Trim', minutes: 45, price: 50, description: 'Smooth head shave with a sharp beard trim.' },
    { name: 'Regular Haircut', minutes: 30, price: 30, description: 'A refreshed, polished cut that turns heads.' },
    { name: 'Skin & Taper Fade', minutes: 30, price: 30, description: 'Each level of the fade blended for a seamless finish.' },
    { name: 'Blowout Taper', minutes: 30, price: 30, description: 'Tapered sides with volume left on top.' },
    { name: 'Textured Haircut', minutes: 30, price: 30, description: 'Movement and texture worked through the top.' },
    { name: 'Head Shaving', minutes: 30, price: 30, description: 'A clean, smooth head shave.' },
    { name: 'Hot Towel Shave', minutes: 30, price: 30, description: 'Classic straight-razor shave with hot towels.' },
    { name: 'Facial Massage', minutes: 30, price: 30, description: 'A relaxing facial massage.' },
    { name: 'Beard Trim', minutes: 30, price: 25, description: 'Beard shaped, trimmed and lined up.' },
    { name: 'Senior Haircut', minutes: 30, price: 25, description: 'A classic cut for seniors.' },
    { name: 'Kids Haircut (7 to 12)', minutes: 30, price: 25, description: 'A cut for kids aged 7 to 12.' },
    { name: 'Kids Haircut (under 7)', minutes: 30, price: 25, description: 'A cut for kids under 7.' },
  ],
};

export const FULL_ADDRESS = `${BUSINESS.address.street}, ${BUSINESS.address.city}, ${BUSINESS.address.region} ${BUSINESS.address.postalCode}`;
