'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { apiRequest } from '@/lib/api/client';
import { DEFAULT_BRANCH_ID } from '@/lib/api/config';
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
} from 'lucide-react';

const INITIAL_SERVICES = [
  { id: 'srv-1', name: 'Haircut Service', price: 23.0, duration: '30 min', category: 'Hair Cut' },
  { id: 'srv-2', name: 'Fade Haircut Service', price: 25.0, duration: '30 min', category: 'Hair Cut' },
  { id: 'srv-3', name: 'Haircut & Beard Trim Combo', price: 38.0, duration: '30 min', category: 'Combo' },
  { id: 'srv-4', name: 'Hot Towel Shave', price: 25.0, duration: '30 min', category: 'Shave' },
  { id: 'srv-5', name: 'Haircut & Hot Shave Combo', price: 40.0, duration: '30 min', category: 'Combo' },
  { id: 'srv-6', name: 'Beard Trim Service', price: 22.0, duration: '30 min', category: 'Beard' },
  { id: 'srv-7', name: 'Senior Haircut Service (65+)', price: 20.0, duration: '30 min', category: 'Specialty' },
  { id: 'srv-8', name: 'Kids Haircut (Under 10)', price: 20.0, duration: '30 min', category: 'Specialty' },
  { id: 'srv-9', name: 'Face Waxing Service', price: 15.0, duration: '30 min', category: 'Waxing' },
];

const INITIAL_STAFF = [
  { id: 'stf-1', name: 'Elena Rostova', role: 'Master Stylist' },
  { id: 'stf-2', name: 'James Carter', role: 'Barber & Fade Specialist' },
  { id: 'stf-3', name: 'Sophia Martinez', role: 'Beard & Shave Specialist' },
  { id: 'stf-any', name: 'Any Available Specialist', role: 'First available slot' },
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];

function formatBookingDateTime(dateStr: string, timeStr: string): string {
  try {
    const parts = timeStr.trim().split(' ');
    const timePart = parts[0] || '10:00';
    const modifier = (parts[1] || 'AM').toUpperCase();
    const [hoursStr, minutesStr] = timePart.split(':');
    let hours = parseInt(hoursStr, 10) || 10;
    const minutes = parseInt(minutesStr, 10) || 0;

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${dateStr}T${formattedHours}:${formattedMinutes}:00`;
  } catch {
    return `${dateStr}T10:00:00`;
  }
}

export default function CustomerBookPage() {
  const router = useRouter();
  const { user, setCustomerSession } = useAuth();
  const { showSuccess, showError } = useToast();

  const [services, setServices] = useState(INITIAL_SERVICES);
  const [staffList, setStaffList] = useState(INITIAL_STAFF);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedService, setSelectedService] = useState(INITIAL_SERVICES[0]);
  const [selectedStaff, setSelectedStaff] = useState(INITIAL_STAFF[0]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:00 AM');

  // Customer info for guest or logged-in user
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || user?.mobile || (!user?.userid?.includes('@') ? user?.userid || '' : ''));
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Sync user info if auth state loads or changes
  useEffect(() => {
    if (user) {
      if (user.name) setCustomerName(user.name);
      const phone = user.phone || user.mobile || (!user.userid?.includes('@') ? user.userid : '');
      if (phone) setCustomerPhone(phone);
      if (user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  // Load live services and staff if available
  useEffect(() => {
    async function loadData() {
      try {
        const srvRes = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
        const srvItems = srvRes.items || srvRes.services || [];
        if (srvItems.length > 0) {
          const mapped = srvItems.map((s: any) => ({
            id: s.serviceId || s.id,
            name: s.name,
            price: Number(s.price),
            duration: `${s.durationMinutes || 30} min`,
            category: s.categoryName || 'General',
          }));
          setServices(mapped);
          setSelectedService(mapped[0]);
        }
      } catch {
        /* fallback to initial */
      }

      try {
        const stfRes = await apiRequest<any>('/api/v1/staff');
        const stfItems = stfRes.items || stfRes.staff || [];
        if (stfItems.length > 0) {
          const mapped = [
            ...stfItems.map((s: any) => ({
              id: s.staffId || s.id,
              name: s.fullName || s.name,
              role: s.role || 'Stylist',
            })),
            { id: 'stf-any', name: 'Any Available Specialist', role: 'First available slot' },
          ];
          setStaffList(mapped);
          setSelectedStaff(mapped[0]);
        }
      } catch {
        /* fallback to initial */
      }
    }
    loadData();
  }, []);

  const handleConfirmBooking = async () => {
    if (!customerName.trim()) {
      showError('Name Required', 'Please enter your name.');
      return;
    }
    if (!customerPhone.trim()) {
      showError('Phone Required', 'Please enter your phone number.');
      return;
    }

    setIsSubmitting(true);
    const isoStartTime = formatBookingDateTime(selectedDate, selectedTime);
    const newBooking = {
      bookingId: `bk-${Date.now()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      serviceName: selectedService.name,
      staffName: selectedStaff.name,
      totalAmount: selectedService.price,
      startTime: isoStartTime,
      status: 'CONFIRMED' as const,
    };

    // Save to client registry for reliable access across pages
    try {
      const existing = JSON.parse(localStorage.getItem('bdiamond_customer_bookings') || '[]');
      localStorage.setItem('bdiamond_customer_bookings', JSON.stringify([newBooking, ...existing]));
    } catch {
      /* ignore */
    }

    // Set customer session in AuthContext
    setCustomerSession({
      name: customerName.trim(),
      phone: customerPhone.trim(),
      email: customerEmail.trim(),
    });

    try {
      await apiRequest('/api/v1/bookings', {
        method: 'POST',
        body: JSON.stringify(newBooking),
      });
    } catch {
      /* fallback to local registry */
    } finally {
      setIsSubmitting(false);
      setIsConfirmed(true);
      showSuccess('Booking Confirmed!', 'We look forward to welcoming you at B Diamond.');
      setTimeout(() => {
        router.push('/customer/profile');
      }, 1500);
    }
  };

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
                Choose from our classic cuts, fades, hot towel shaves, or combos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => setSelectedService(srv)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                    selectedService.id === srv.id
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-ring)]'
                      : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="text-xs font-black text-[var(--foreground)]">{srv.name}</h3>
                    <span className="text-xs font-black text-[var(--primary)]">${srv.price.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)] font-medium">
                    <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>{srv.duration}</span>
                    <span>• {srv.category}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md"
              >
                <span>Continue to Specialist</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[var(--foreground)]">Choose Stylist / Specialist</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Select your preferred barber or choose first available.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {staffList.map((stf) => (
                <div
                  key={stf.id}
                  onClick={() => setSelectedStaff(stf)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedStaff.id === stf.id
                      ? 'border-[var(--primary)] bg-[var(--primary-light)] ring-2 ring-[var(--primary-ring)]'
                      : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--primary)] to-rose-400 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {stf.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-[var(--foreground)]">{stf.name}</h3>
                    <p className="text-[11px] font-medium text-[var(--muted-foreground)]">{stf.role}</p>
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
              <h2 className="text-lg font-black text-[var(--foreground)]">Select Date & Time Slot</h2>
              <p className="text-xs text-[var(--muted-foreground)] font-medium">
                Downtown Main Branch (BD-DT01) operational hours.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">Preferred Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">Available Time Slots</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition-all ${
                      selectedTime === slot
                        ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm'
                        : 'border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
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
                className="btn-primary px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md"
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
                    <span className="font-black text-[var(--foreground)]">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Specialist:</span>
                    <span className="font-black text-[var(--foreground)]">{selectedStaff.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Date & Time:</span>
                    <span className="font-black text-[var(--primary)]">
                      {selectedDate} at {selectedTime}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Location:</span>
                    <span className="font-black text-[var(--foreground)]">Downtown Main (593 King St)</span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-[var(--border-strong)]">
                    <span>Total Amount:</span>
                    <span className="text-emerald-600">${selectedService.price.toFixed(2)} CAD</span>
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[var(--foreground)]">Your Contact Information</h3>
                    {user && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                        Autofilled from active profile
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Phase 1 Payment Notice: Pay in Cash at salon checkout upon service completion.</span>
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
                    {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
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
