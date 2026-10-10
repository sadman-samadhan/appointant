'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID, ONLINE_BOOKING_ENABLED } from '@/lib/api/config';
import {
  Scissors,
  User,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ServiceDto, StaffResponseDto, ServiceAddonDto, UnifiedSlotDto } from '@/lib/types';
import { formatMoney, servicePrice, serviceDuration, toList, todayISO } from '@/lib/format';
import { BUSINESS } from '@/lib/business';

export default function CustomerBookPage() {
  const router = useRouter();
  const { user, setCustomerSession, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showSuccess, showError } = useToast();

  const [services, setServices] = useState<ServiceDto[]>([]);
  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponseDto | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedTime, setSelectedTime] = useState('10:00:00');

  // Customer contact form
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(
    user?.phone || user?.mobile || (!user?.userid?.includes('@') ? user?.userid || '' : '+1 (506) ')
  );
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [bookingNotes, setBookingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Sync user profile if available
  useEffect(() => {
    if (user) {
      if (user.name) setCustomerName(user.name);
      const phone = user.phone || user.mobile || (!user.userid?.includes('@') ? user.userid : '');
      if (phone) setCustomerPhone(phone);
      if (user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  // Load live services and staff catalog
  // The salon server only answers signed-in users, so wait for a session first.
  useEffect(() => {
    if (!isAuthenticated) return;
    async function loadCatalog() {
      try {
        const srvRes = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
        let srvItems = toList(srvRes, 'services').filter(Boolean);
        if (srvItems.length === 0) {
          const allRes = await apiRequest<any>('/api/v1/services');
          srvItems = toList(allRes, 'services').filter(Boolean);
        }
        if (srvItems.length > 0) {
          const activeOnly = srvItems.filter(
            (s: any) => s.status === 'ACTIVE' || s.isActive === true || (!s.status && s.isActive !== false)
          );
          const effective = activeOnly.length > 0 ? activeOnly : srvItems;
          const normalized: ServiceDto[] = effective
            .filter((s: any) => s && (s.serviceId || s.id))
            .map((s: any) => ({
              serviceId: s.serviceId || s.id,
              name: s.name || 'Service',
              description: s.description,
              price: servicePrice(s),
              durationMinutes: serviceDuration(s),
              categoryName: s.categoryName || s.category?.name || 'General',
            }));
          setServices(normalized);

          let preselected: ServiceDto | undefined = normalized[0];
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetId = params.get('serviceId');
            if (targetId) {
              const matched = normalized.find((s) => s.serviceId === targetId);
              if (matched) preselected = matched;
            }
          }
          setSelectedService(preselected || null);
        }
      } catch {
        /* empty */
      }

      try {
        const stfRes = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
        const stfItems = toList(stfRes, 'staff').filter(
          (s: any) => s && (s.staffId || s.id) && s.status !== 'TERMINATED' && s.status !== 'INACTIVE'
        );
        if (stfItems.length > 0) {
          const normalized: StaffResponseDto[] = stfItems.map((s: any) => ({
            staffId: s.staffId || s.id,
            fullName: s.fullName || s.name || 'Specialist',
            roleTitle: s.roleTitle || s.role || 'Barber Specialist',
            email: s.email,
            phone: s.phone,
            employmentType: s.employmentType || 'FULL_TIME',
            status: s.status || 'ACTIVE',
          }));
          setStaffList(normalized);
        }
      } catch {
        /* empty */
      }
    }
    loadCatalog();
  }, [isAuthenticated]);

  // Fetch real-time available time slots when date, service, or staff changes
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedService || !selectedDate) return;
    setIsLoadingSlots(true);
    const slots: string[] = [];

    try {
      const staffParam = selectedStaff ? `&preferredStaffId=${selectedStaff.staffId}` : '';
      const res = await apiRequest<any>(
        `/api/v1/availability/unified?branchId=${DEFAULT_BRANCH_ID}&serviceId=${selectedService.serviceId}&startDate=${selectedDate}&endDate=${selectedDate}${staffParam}`
      );
      const items = toList(res, 'slots', 'availableSlots');
      items.forEach((slot: any) => {
        if (!slot || slot.available === false) return;
        const timeStr = typeof slot === 'string' ? slot : slot.startTime || slot.time;
        if (typeof timeStr !== 'string' || !timeStr) return;
        let formatted = timeStr.includes('T') ? timeStr.split('T')[1].substring(0, 8) : timeStr.substring(0, 8);
        if (/^\d{2}:\d{2}$/.test(formatted)) formatted = `${formatted}:00`;
        if (/^\d{2}:\d{2}:\d{2}$/.test(formatted) && !slots.includes(formatted)) slots.push(formatted);
      });
    } catch {
      /* no slots available */
    }

    setAvailableSlots(slots);
    setSelectedTime(slots[0] || '');
    setIsLoadingSlots(false);
  }, [selectedService, selectedStaff, selectedDate]);

  useEffect(() => {
    if (step === 3) {
      fetchAvailableSlots();
    }
  }, [step, fetchAvailableSlots]);

  const handleConfirmBooking = async () => {
    if (!selectedService) {
      showError('Service Missing', 'Please select a service first.');
      return;
    }
    if (!customerName.trim()) {
      showError('Name Required', 'Please enter your full name.');
      return;
    }
    if (!customerPhone.trim()) {
      showError('Phone Required', 'Please enter your phone number.');
      return;
    }

    setIsSubmitting(true);
    let customerId = '';

    // 1. Create/Find Customer in Backend CRM
    try {
      const custRes = await apiRequest<any>('/api/v1/customers', {
        method: 'POST',
        body: JSON.stringify({
          fullName: customerName.trim(),
          contacts: [
            { type: 'PHONE', value: customerPhone.trim(), isPrimary: true },
            ...(customerEmail.trim()
              ? [{ type: 'EMAIL', value: customerEmail.trim(), isPrimary: false }]
              : []),
          ],
        }),
      });

      customerId = custRes?.customerId || custRes?.id || custRes?.customer?.customerId || '';

      if (customerId) {
        try {
          await apiRequest(`/api/v1/tenants/${DEFAULT_TENANT_ID}/customers`, {
            method: 'POST',
            body: JSON.stringify({
              customerId,
              preferredBranchId: DEFAULT_BRANCH_ID,
            }),
          });
        } catch {
          /* ignore link error */
        }
      }
    } catch {
      /* customer may already exist - look it up below */
    }

    if (!customerId) {
      try {
        const searchRes = await apiRequest<any>(
          `/api/v1/tenants/${DEFAULT_TENANT_ID}/customers?search=${encodeURIComponent(customerPhone.trim())}`
        );
        const match = toList(searchRes, 'customers')[0];
        customerId = match?.customerId || match?.customer?.customerId || '';
      } catch {
        /* handled below */
      }
    }

    if (!customerId) {
      showError('Booking Failed', 'Could not create or find your customer profile. Please try again.');
      setIsSubmitting(false);
      return;
    }

    // 2. Reserve slot temporarily
    let reservationId: string | undefined = undefined;
    try {
      const reserveRes = await apiRequest<any>('/api/v1/availability/reserve', {
        method: 'POST',
        body: JSON.stringify({
          tenantId: DEFAULT_TENANT_ID,
          branchId: DEFAULT_BRANCH_ID,
          serviceId: selectedService.serviceId,
          customerId,
          date: selectedDate,
          startTime: selectedTime,
          endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
          staffId: selectedStaff?.staffId || undefined,
          ttlMinutes: 15,
        }),
      });
      reservationId = reserveRes?.reservationId || reserveRes?.id;
    } catch {
      /* continue without reservation lock */
    }

    // 3. Create Booking in Core Backend
    const bookingPayload = {
      tenantId: DEFAULT_TENANT_ID,
      branchId: DEFAULT_BRANCH_ID,
      customerId,
      serviceId: selectedService.serviceId,
      staffId: selectedStaff?.staffId || undefined,
      date: selectedDate,
      startTime: selectedTime,
      endTime: calculateEndTime(selectedTime, selectedService.durationMinutes),
      reservationId,
      notes: bookingNotes.trim() || undefined,
    };

    try {
      const bkRes: any = await apiRequest('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify(bookingPayload),
      });

      // The bill is created when the shop marks the appointment Done.
      if (!(bkRes?.bookingId || bkRes?.id || bkRes?.booking?.bookingId)) {
        throw new Error('Your booking was not saved. Please try again.');
      }

      setCustomerSession({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
      });

      setIsConfirmed(true);
      showSuccess('Appointment Confirmed!', 'We look forward to welcoming you at B Diamond.');
      setTimeout(() => {
        router.push('/customer/profile');
      }, 1500);
    } catch (err: any) {
      showError('Booking Failed', err?.message || 'Could not complete appointment booking.');
    } finally {
      setIsSubmitting(false);
    }
  };

  function calculateEndTime(start: string, durationMinutes: number): string {
    try {
      const [h, m, s] = start.split(':').map((n) => parseInt(n, 10) || 0);
      const totalMinutes = h * 60 + m + (durationMinutes || 30);
      const endH = Math.floor(totalMinutes / 60) % 24;
      const endM = totalMinutes % 60;
      return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:${(s || 0).toString().padStart(2, '0')}`;
    } catch {
      return start;
    }
  }

  function formatTimeDisplay(timeStr: string): string {
    try {
      const [hStr, mStr] = timeStr.split(':');
      let hours = parseInt(hStr, 10);
      const minutes = mStr || '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  }

  if (isAuthLoading) {
    return <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (!ONLINE_BOOKING_ENABLED) {
    return (
      <div className="max-w-md mx-auto glass-card p-8 rounded-3xl border border-[var(--border)] text-center space-y-4 animate-fade-in">
        <h2 className="text-xl font-black text-[var(--foreground)]">Book your appointment</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Online booking is handled on our booking page for now. You can also call us at{' '}
          <a href={`tel:${BUSINESS.phone}`} className="font-bold text-[var(--primary)]">
            {BUSINESS.phoneDisplay}
          </a>
          .
        </p>
        <a
          href={BUSINESS.setmoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center"
        >
          Go to booking page
        </a>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto glass-card p-8 rounded-3xl border border-[var(--border)] text-center space-y-4 animate-fade-in">
        <h2 className="text-xl font-black text-[var(--foreground)]">Sign in to book</h2>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Please sign in or create a free account to book an appointment. It only takes a minute.
        </p>
        <Link
          href="/login?next=/customer/book"
          className="btn-primary w-full py-3 rounded-xl text-xs font-bold inline-flex items-center justify-center"
        >
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto py-2 animate-fade-in">
      {/* Header Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/customer/profile"
          className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Profile</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-extrabold border border-[var(--primary-ring)]">
          <Scissors className="w-3.5 h-3.5" />
          <span>B Diamond Online Booking</span>
        </div>
      </div>

      {/* Booking Container */}
      <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6 border border-[var(--border)]">
        {/* Step Progress Tracker */}
        <div className="grid grid-cols-4 gap-2 border-b border-[var(--border)] pb-4">
          <div
            className={`text-center py-1 border-b-2 text-xs font-black transition-all ${
              step >= 1
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)]'
            }`}
          >
            1. Service
          </div>
          <div
            className={`text-center py-1 border-b-2 text-xs font-black transition-all ${
              step >= 2
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)]'
            }`}
          >
            2. Specialist
          </div>
          <div
            className={`text-center py-1 border-b-2 text-xs font-black transition-all ${
              step >= 3
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)]'
            }`}
          >
            3. Date & Slot
          </div>
          <div
            className={`text-center py-1 border-b-2 text-xs font-black transition-all ${
              step >= 4
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--muted-foreground)]'
            }`}
          >
            4. Confirm
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[var(--foreground)]">Select Salon Service</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Choose from our available salon offerings and grooming treatments.
              </p>
            </div>

            {services.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                No services available at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {services.map((srv) => (
                  <div
                    key={srv.serviceId}
                    onClick={() => setSelectedService(srv)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      selectedService?.serviceId === srv.serviceId
                        ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-ring)]'
                        : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-xs font-black text-[var(--foreground)]">{srv.name}</h3>
                      <span className="text-xs font-black text-[var(--primary)]">${formatMoney(srv.price)} CAD</span>
                    </div>
                    {srv.description && (
                      <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1">{srv.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] font-medium">
                      <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>{srv.durationMinutes} min</span>
                      {srv.categoryName && <span>• {srv.categoryName}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  if (!selectedService) {
                    showError('Select Service', 'Please select a service to proceed.');
                    return;
                  }
                  setStep(2);
                }}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md"
              >
                <span>Continue to Specialist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Specialist */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[var(--foreground)]">Choose Stylist / Specialist</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Select your preferred specialist or choose first available.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option: Any Available Specialist */}
              <div
                onClick={() => setSelectedStaff(null)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                  selectedStaff === null
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-ring)]'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ★
                </div>
                <div>
                  <h3 className="text-xs font-black text-[var(--foreground)]">Any Available Specialist</h3>
                  <p className="text-[11px] font-medium text-[var(--muted-foreground)]">First open schedule slot</p>
                </div>
              </div>

              {staffList.map((stf) => (
                <div
                  key={stf.staffId}
                  onClick={() => setSelectedStaff(stf)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedStaff?.staffId === stf.staffId
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-ring)]'
                      : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--primary)] to-rose-400 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(stf.fullName || '?').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{stf.fullName}</h3>
                    <p className="text-[11px] font-medium text-[var(--muted-foreground)]">
                      {stf.roleTitle || stf.role || 'Barber Specialist'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md"
              >
                <span>Select Time Slot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Date & Slot */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[var(--foreground)]">Select Date & Available Time Slot</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Live availability engine at Downtown Main Branch.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">Preferred Date</label>
              <input
                type="date"
                min={todayISO()}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">Available Slots</label>
              {isLoadingSlots ? (
                <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                  Calculating real-time availability slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="p-6 text-center text-xs text-rose-600 bg-rose-50 rounded-2xl">
                  No slots available on this date. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all ${
                        selectedTime === slot
                          ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                          : 'border-[var(--border)] text-[var(--foreground)] bg-[var(--card)] hover:border-[var(--primary)]'
                      }`}
                    >
                      {formatTimeDisplay(slot)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedTime || isLoadingSlots}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Summary & Confirm */}
        {step === 4 && (
          <div className="space-y-6">
            {isConfirmed ? (
              <div className="p-8 text-center space-y-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl border border-emerald-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] font-medium">
                  We look forward to seeing you at 593 King Street, Fredericton. Redirecting to profile...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-[var(--foreground)]">Confirm Your Appointment</h2>
                  <p className="text-xs text-[var(--muted-foreground)] font-medium">Review booking details below.</p>
                </div>

                <div className="p-5 rounded-2xl bg-[var(--muted)] border border-[var(--border)] space-y-3 text-xs font-semibold text-[var(--foreground)]">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Service:</span>
                    <span className="font-black text-[var(--foreground)]">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Specialist:</span>
                    <span className="font-black text-[var(--foreground)]">
                      {selectedStaff?.fullName || 'First Available Specialist'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Date & Time:</span>
                    <span className="font-black text-[var(--primary)]">
                      {selectedDate} at {formatTimeDisplay(selectedTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Location:</span>
                    <span className="font-black text-[var(--foreground)]">Downtown Main (593 King St)</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-[var(--border-strong)]">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600">${formatMoney(selectedService?.price)} CAD</span>
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-[var(--foreground)]">Your Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone Number (+1 ...)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                    />
                  </div>
                  <input
                    type="email"
                    placeholder="Email Address (Optional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                  />
                  <textarea
                    rows={2}
                    placeholder="Special requests / notes (e.g. Skin fade with razor finish)..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Phase 1 Payment Notice: Settle in Cash at checkout upon service completion.</span>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    onClick={() => setStep(3)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting}
                    className="btn-primary px-8 py-3 rounded-xl text-xs font-black shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Confirming with Backend...' : 'Confirm Appointment'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
