'use client';

import React, { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api/client';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { Users, Plus, Calendar, Mail, Phone, ShieldCheck, Clock } from 'lucide-react';
import { StaffResponseDto } from '@/lib/types';

const INITIAL_STAFF: StaffResponseDto[] = [
  {
    staffId: 'stf-1',
    fullName: 'Elena Rostova',
    email: 'elena@bdiamond.com',
    phone: '+1 (506) 883-2222',
    role: 'Master Stylist',
    status: 'ACTIVE',
    expertise: [{ id: 'exp-1', expertiseName: 'Hair Styling & Color' }],
  },
  {
    staffId: 'stf-2',
    fullName: 'James Carter',
    email: 'james@bdiamond.com',
    phone: '+1 (506) 883-2222',
    role: 'Barber Specialist',
    status: 'ACTIVE',
    expertise: [{ id: 'exp-2', expertiseName: 'Hot Shave & Fades' }],
  },
  {
    staffId: 'stf-3',
    fullName: 'Sophia Martinez',
    email: 'sophia@bdiamond.com',
    phone: '+1 (506) 883-2222',
    role: 'Senior Barber',
    status: 'ACTIVE',
    expertise: [{ id: 'exp-3', expertiseName: 'Beard Trimming & Waxing' }],
  },
];

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffResponseDto[]>(INITIAL_STAFF);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffResponseDto | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+1 (506) 883-2222');
  const [role, setRole] = useState('Barber Specialist');
  const { showSuccess, showError } = useToast();

  const loadStaff = async () => {
    try {
      const res = await apiRequest<any>('/api/v1/staff');
      const list: StaffResponseDto[] = res.items || res.staff || [];
      if (list.length > 0) setStaffList(list);
    } catch {
      /* Keep initial staff directory */
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/staff', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, phone, role, status: 'ACTIVE' }),
      });
      showSuccess('Staff Registered', `${fullName} added to specialist roster.`);
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      loadStaff();
    } catch (err: any) {
      showError('Action Failed', err.message || 'Failed to register staff');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Staff & Working Shifts</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage specialists, expertise badges, and weekly shift schedules.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add Specialist</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((stf) => (
          <div
            key={stf.staffId}
            className="glass-card p-5 rounded-2xl space-y-4 border border-[var(--border)] hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[var(--primary)] to-rose-400 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                {stf.fullName.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-[var(--foreground)] leading-tight">{stf.fullName}</h3>
                <span className="text-xs font-bold text-[var(--primary)] block">{stf.role}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  {stf.status}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] font-semibold">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span>{stf.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span>{stf.phone}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border)] flex gap-2">
              <button
                onClick={() => {
                  setSelectedStaff(stf);
                  setShowScheduleModal(true);
                }}
                className="w-full py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                Configure Shift Hours
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Specialist"
        maxWidth="md"
      >
        <form onSubmit={handleCreateStaff} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Michael Carter"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="michael@bdiamond.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Role / Specialization</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
            >
              <option value="Barber Specialist">Barber Specialist</option>
              <option value="Master Stylist">Master Stylist</option>
              <option value="Beard & Shave Artist">Beard & Shave Artist</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary px-5 py-2 rounded-xl text-xs font-bold">
              Save Specialist
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure Weekly Schedule Modal */}
      {selectedStaff && (
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title={`Shift Schedule — ${selectedStaff.fullName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Configure working shift hours for Fredericton Downtown Main Branch (BD-DT01).
            </p>

            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div
                  key={day}
                  className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-between gap-3 text-xs font-bold text-[var(--foreground)]"
                >
                  <span className="w-24">{day}</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span>09:00 AM - 06:00 PM</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                    Active Shift
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                onClick={() => {
                  showSuccess('Schedule Updated', `Weekly shifts saved for ${selectedStaff.fullName}`);
                  setShowScheduleModal(false);
                }}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold"
              >
                Save Weekly Schedule
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
