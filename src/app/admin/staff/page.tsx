'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/api/client';
import { isStrongPassword, PASSWORD_RULES } from '@/lib/password';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_TENANT_ID, DEFAULT_BRANCH_ID } from '@/lib/api/config';
import {
  Users,
  Plus,
  Calendar,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  Shield,
  UserPlus,
  Clock,
  Award,
  Archive,
  RotateCcw,
  Edit,
  Trash2,
  CheckCircle2,
  Sparkles,
  Scissors,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StaffResponseDto, ServiceDto, WeeklyScheduleDto, StaffExpertiseDto } from '@/lib/types';
import { formatMoney, servicePrice, serviceDuration, toList, todayISO } from '@/lib/format';

function normalizeService(s: any): ServiceDto {
  return {
    serviceId: s.serviceId || s.id,
    name: s.name || 'Salon Service',
    description: s.description,
    price: servicePrice(s),
    basePrice: servicePrice(s),
    durationMinutes: serviceDuration(s),
    baseDurationMinutes: serviceDuration(s),
    categoryId: s.categoryId || s.category?.categoryId,
    categoryName: s.categoryName || s.category?.name,
    status: s.status || 'ACTIVE',
    currency: s.currency || 'CAD',
  };
}

const DAYS_OF_WEEK = [
  { dayIndex: 1, name: 'Monday' },
  { dayIndex: 2, name: 'Tuesday' },
  { dayIndex: 3, name: 'Wednesday' },
  { dayIndex: 4, name: 'Thursday' },
  { dayIndex: 5, name: 'Friday' },
  { dayIndex: 6, name: 'Saturday' },
  { dayIndex: 0, name: 'Sunday' },
];

/** "Mon–Fri 9:00–18:00 · Sat 10:00–16:00" from a weekly schedule; days switched off are left out. */
function scheduleSummary(rows: WeeklyScheduleDto[]): string {
  if (rows.length === 0) return 'No schedule set: works all shop hours';
  const hm = (t?: string) => String(t || '').slice(0, 5);
  const days = DAYS_OF_WEEK.map((d) => {
    const row = rows.find((r) => r.dayOfWeek === d.dayIndex);
    // A day with no row counts as shop hours (see slots.barberHours).
    return { short: d.name.slice(0, 3), hours: !row ? 'shop hours' : row.isActive === false ? '' : `${hm(row.startTime)}–${hm(row.endTime)}` };
  });
  const parts: string[] = [];
  for (let i = 0; i < days.length; ) {
    let j = i;
    while (j + 1 < days.length && days[j + 1].hours === days[i].hours) j++;
    if (days[i].hours) parts.push(`${days[i].short}${j > i ? `–${days[j].short}` : ''} ${days[i].hours}`);
    i = j + 1;
  }
  return parts.length ? parts.join(' · ') : 'Not working any day';
}

export default function AdminStaffPage() {
  const { showSuccess, showError } = useToast();

  const [staffList, setStaffList] = useState<StaffResponseDto[]>([]);
  const [allSchedules, setAllSchedules] = useState<WeeklyScheduleDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffResponseDto | null>(null);
  const [systemRole, setSystemRole] = useState<'STAFF' | 'ADMIN'>('STAFF');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleTitle, setRoleTitle] = useState('Barber Specialist');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'PART_TIME' | 'CONTRACT'>('FULL_TIME');
  const [createLoginUser, setCreateLoginUser] = useState(false);
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false);

  // Shift Schedules Modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] = useState<StaffResponseDto | null>(null);
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleDto[]>([]);
  const [shiftStartTimes, setShiftStartTimes] = useState<Record<number, string>>({});
  const [shiftEndTimes, setShiftEndTimes] = useState<Record<number, string>>({});
  const [shiftActiveDays, setShiftActiveDays] = useState<Record<number, boolean>>({});
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Expertise Modal
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [selectedStaffForExpertise, setSelectedStaffForExpertise] = useState<StaffResponseDto | null>(null);
  const [staffExpertiseList, setStaffExpertiseList] = useState<StaffExpertiseDto[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState<'BEGINNER' | 'ADVANCED' | 'EXPERT'>('ADVANCED');
  const [isSubmittingExpertise, setIsSubmittingExpertise] = useState(false);

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest<any>(`/api/v1/staff?tenantId=${DEFAULT_TENANT_ID}`);
      const list = toList<any>(res, 'staff').filter((s: any) => s && (s.staffId || s.id));
      const normalized: StaffResponseDto[] = list.map((s: any) => ({
        staffId: s.staffId || s.id,
        userId: s.userId || s.user?.id || s.user_id,
        fullName: s.fullName || s.name || 'Specialist',
        email: s.email || '',
        phone: s.phone,
        roleTitle: s.roleTitle || s.role || 'Barber Specialist',
        employmentType: s.employmentType || 'FULL_TIME',
        status: s.status || 'ACTIVE',
      }));
      setStaffList(normalized);
      apiRequest<any>('/api/v1/availability/weekly-schedules?entityType=STAFF')
        .then((r) => setAllSchedules(toList<WeeklyScheduleDto>(r, 'schedules')))
        .catch(() => setAllSchedules([]));
    } catch {
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      const res = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
      const normalized: ServiceDto[] = toList<any>(res, 'services')
        .filter((s: any) => s && (s.serviceId || s.id))
        .map(normalizeService);
      setServices(normalized);
      if (normalized.length > 0) {
        setSelectedServiceId(normalized[0].serviceId);
      }
    } catch {
      setServices([]);
    }
  }, []);

  useEffect(() => {
    loadStaff();
    loadServices();
  }, [loadStaff, loadServices]);

  // Handle Save Staff
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    // The backend makes the login together with a new staff member and links the two.
    const wantsLogin = createLoginUser && !editingStaff;
    if (wantsLogin) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return showError('Email needed', 'The login uses the email address. Enter a valid email.');
      if (!isStrongPassword(staffPassword)) return showError('Password too weak', PASSWORD_RULES);
    }
    setIsSubmittingStaff(true);
    try {
      if (editingStaff) {
        await apiRequest(`/api/v1/staff/${editingStaff.staffId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            roleTitle: roleTitle.trim(),
            employmentType,
          }),
        });

        // Admin rights are per shop now (only the owner is admin here); the job title is
        // informational. Granting the global Auth ROLE_ADMIN would leak admin rights to other shops.

        showSuccess(
          systemRole === 'ADMIN' ? 'Store Administrator Updated' : 'Specialist Updated',
          `${fullName} profile updated.`
        );
      } else {

        const createRes = await apiRequest<any>('/api/v1/staff', {
          method: 'POST',
          body: JSON.stringify({
            tenantId: DEFAULT_TENANT_ID,
            fullName: fullName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            roleTitle: roleTitle.trim(),
            employmentType,
            hireDate: todayISO(),
            ...(wantsLogin ? { createUser: true, password: staffPassword } : {}),
          }),
        });

        // Link primary branch
        const newStaffId = createRes?.staffId || createRes?.id;
        if (newStaffId) {
          try {
            await apiRequest(`/api/v1/staff/${newStaffId}/branches`, {
              method: 'POST',
              body: JSON.stringify({
                branchId: DEFAULT_BRANCH_ID,
                isPrimary: true,
              }),
            });
          } catch {
            /* ignore branch link error */
          }
        }

        showSuccess(
          systemRole === 'ADMIN' ? 'Store Administrator Registered' : 'Specialist Registered',
          `${fullName} added to the team.`
        );
      }
      setShowAddModal(false);
      setEditingStaff(null);
      setFullName('');
      setEmail('');
      loadStaff();
    } catch (err: any) {
      if (!editingStaff && err?.status === 409) {
        showError(
          'Email already used',
          'This email already has an account or belongs to another staff member. Use a different email for the login, or untick "Create a login".'
        );
      } else {
        showError('Could not save', err?.message || 'Please try again.');
      }
    } finally {
      setIsSubmittingStaff(false);
    }
  };

  // Archive / Restore Staff
  const isArchivedStaff = (status?: string) =>
    status === 'ARCHIVED' || status === 'TERMINATED' || status === 'INACTIVE';

  const handleToggleArchive = async (staff: StaffResponseDto) => {
    const isArchived = isArchivedStaff(staff.status);
    try {
      if (isArchived) {
        await apiRequest(`/api/v1/staff/${staff.staffId}/restore`, { method: 'POST' });
        showSuccess('Staff Restored', `${staff.fullName} restored to active roster.`);
      } else {
        await apiRequest(`/api/v1/staff/${staff.staffId}/archive`, {
          method: 'POST',
          body: JSON.stringify({
            reason: 'Archived by salon administrator',
          }),
        });
        showSuccess('Staff Archived', `${staff.fullName} archived.`);
      }
      loadStaff();
    } catch (err: any) {
      showError('Action Failed', err?.message || 'Could not toggle archive state');
    }
  };

  // Shifts / Schedule Workflow
  const openScheduleModal = async (staff: StaffResponseDto) => {
    setSelectedStaffForSchedule(staff);
    setShowScheduleModal(true);

    const defaultStarts: Record<number, string> = {};
    const defaultEnds: Record<number, string> = {};
    const defaultActives: Record<number, boolean> = {};

    DAYS_OF_WEEK.forEach((d) => {
      defaultStarts[d.dayIndex] = '09:00:00';
      defaultEnds[d.dayIndex] = '18:00:00';
      defaultActives[d.dayIndex] = d.dayIndex !== 0; // Sunday off by default
    });

    setWeeklySchedules([]);
    try {
      const res = await apiRequest<any>(
        `/api/v1/availability/weekly-schedules?entityType=STAFF&entityId=${staff.staffId}`
      );
      const items = toList<WeeklyScheduleDto>(res, 'schedules').filter(
        (item) => item && (!item.entityId || item.entityId === staff.staffId)
      );
      if (items.length > 0) {
        setWeeklySchedules(items);
        items.forEach((item) => {
          if (item.startTime) defaultStarts[item.dayOfWeek] = item.startTime;
          if (item.endTime) defaultEnds[item.dayOfWeek] = item.endTime;
          defaultActives[item.dayOfWeek] = item.isActive !== false;
        });
      }
    } catch {
      /* fallback defaults */
    }

    setShiftStartTimes(defaultStarts);
    setShiftEndTimes(defaultEnds);
    setShiftActiveDays(defaultActives);
  };

  const handleSaveWeeklySchedule = async () => {
    if (!selectedStaffForSchedule) return;
    setIsSubmittingSchedule(true);
    try {
      for (const day of DAYS_OF_WEEK) {
        const isActive = shiftActiveDays[day.dayIndex];
        const startTime = shiftStartTimes[day.dayIndex] || '09:00:00';
        const endTime = shiftEndTimes[day.dayIndex] || '18:00:00';

        const payload = {
          entityType: 'STAFF',
          entityId: selectedStaffForSchedule.staffId,
          branchId: DEFAULT_BRANCH_ID,
          dayOfWeek: day.dayIndex,
          startTime,
          endTime,
          isActive: !!isActive,
        };
        // Update the existing row for this day instead of creating duplicates on every save.
        const existing = weeklySchedules.find((w) => w.dayOfWeek === day.dayIndex);
        const existingId = existing?.scheduleId || existing?.id;
        if (existingId) {
          await apiRequest(`/api/v1/availability/weekly-schedules/${existingId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          await apiRequest('/api/v1/availability/weekly-schedules', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
      }
      showSuccess('Schedule Saved', `Weekly shifts updated for ${selectedStaffForSchedule.fullName}`);
      setShowScheduleModal(false);
      loadStaff();
    } catch (err: any) {
      showError('Schedule Failed', err?.message || 'Could not update schedule');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  // Expertise Workflow
  const openExpertiseModal = async (staff: StaffResponseDto) => {
    setSelectedStaffForExpertise(staff);
    setShowExpertiseModal(true);

    let currentServices = services;
    if (currentServices.length === 0) {
      try {
        const sRes = await apiRequest<any>(`/api/v1/services/branches/${DEFAULT_BRANCH_ID}`);
        const sList = toList<any>(sRes, 'services').filter((s: any) => s && (s.serviceId || s.id));
        if (sList.length > 0) {
          currentServices = sList.map(normalizeService);
          setServices(currentServices);
        }
      } catch {
        /* empty */
      }
    }

    if (currentServices.length > 0) {
      setSelectedServiceId(currentServices[0].serviceId);
    }

    try {
      const res = await apiRequest<any>(`/api/v1/staff/${staff.staffId}/expertise`);
      setStaffExpertiseList(toList(res, 'expertise'));
    } catch {
      setStaffExpertiseList([]);
    }
  };

  const handleAddExpertise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForExpertise || !selectedServiceId) return;
    setIsSubmittingExpertise(true);
    try {
      // Find or create matching master expertise
      let targetExpertiseId = selectedServiceId;
      const matchedService = services.find((s) => s.serviceId === selectedServiceId);
      const skillName = matchedService?.name || 'Salon Specialist Skill';

      // 1. Try to find or auto-create expertise in master catalog
      try {
        const expListRes = await apiRequest<any>('/api/v1/expertise');
        const expList = toList<any>(expListRes, 'expertise');
        const existingExp = expList.length > 0
          ? expList.find(
              (x: any) =>
                String(x?.name || '').toLowerCase().trim() === skillName.toLowerCase().trim() ||
                x.expertiseId === selectedServiceId ||
                x.id === selectedServiceId
            )
          : null;

        if (existingExp) {
          targetExpertiseId = existingExp.expertiseId || existingExp.id;
        } else {
          const createExpRes = await apiRequest<any>('/api/v1/expertise', {
            method: 'POST',
            body: JSON.stringify({
              name: skillName,
              description: `Specialist skill capability for ${skillName}`,
            }),
          });
          targetExpertiseId = createExpRes?.expertiseId || createExpRes?.id || targetExpertiseId;
        }
      } catch {
        /* fallback to selectedServiceId */
      }

      // 2. Assign expertise to staff member
      await apiRequest(`/api/v1/staff/${selectedStaffForExpertise.staffId}/expertise`, {
        method: 'POST',
        body: JSON.stringify({
          expertiseId: targetExpertiseId,
          proficiencyLevel, // 'BEGINNER' | 'ADVANCED' | 'EXPERT'
        }),
      });
      showSuccess('Skill Assigned', `${skillName} mapped to ${selectedStaffForExpertise.fullName}.`);
      openExpertiseModal(selectedStaffForExpertise);
    } catch (err: any) {
      showError('Skill Failed', err?.message || 'Could not assign skill');
    } finally {
      setIsSubmittingExpertise(false);
    }
  };

  const handleDeleteExpertise = async (exp: any) => {
    if (!selectedStaffForExpertise) return;
    const targetId = exp.staffExpertiseId || exp.id || exp.expertiseId;
    try {
      await apiRequest(
        `/api/v1/staff/${selectedStaffForExpertise.staffId}/expertise/${targetId}`,
        { method: 'DELETE' }
      );
      showSuccess('Skill Removed', 'Expertise removed.');
      openExpertiseModal(selectedStaffForExpertise);
    } catch (err: any) {
      // If primary ID failed with not found, try fallback with secondary ID
      const fallbackId = targetId === exp.id ? (exp.expertiseId || exp.staffExpertiseId) : exp.id;
      if (fallbackId && fallbackId !== targetId) {
        try {
          await apiRequest(
            `/api/v1/staff/${selectedStaffForExpertise.staffId}/expertise/${fallbackId}`,
            { method: 'DELETE' }
          );
          showSuccess('Skill Removed', 'Expertise removed.');
          openExpertiseModal(selectedStaffForExpertise);
          return;
        } catch {
          /* ignore and show error */
        }
      }
      showError('Failed', err?.message || 'Could not delete expertise');
    }
  };

  const openAddStaffModal = (role: 'STAFF' | 'ADMIN' = 'STAFF') => {
    setEditingStaff(null);
    setSystemRole(role);
    setFullName('');
    setEmail('');
    setPhone('');
    setRoleTitle(role === 'ADMIN' ? 'Store Administrator' : 'Barber Specialist');
    setCreateLoginUser(true);
    setStaffPassword('');
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--foreground)] tracking-tight">Staff & Store Administrators</h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 font-medium">
            Manage salon specialists, store administrators with full access, working hours, and service expertise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openAddStaffModal('ADMIN')}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Add Store Admin</span>
          </button>
          <button
            onClick={() => openAddStaffModal('STAFF')}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Specialist</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'ACTIVE'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Active Specialists ({staffList.filter((s) => s.status !== 'ARCHIVED' && s.status !== 'TERMINATED').length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('ARCHIVED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            statusFilter === 'ARCHIVED'
              ? 'bg-[var(--primary)] text-white shadow-sm font-black'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          Terminated / Archived ({staffList.filter((s) => s.status === 'ARCHIVED' || s.status === 'TERMINATED').length})
        </button>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">Loading specialists roster...</div>
      ) : staffList.filter((stf) => statusFilter === 'ACTIVE' ? (stf.status !== 'ARCHIVED' && stf.status !== 'TERMINATED') : (stf.status === 'ARCHIVED' || stf.status === 'TERMINATED')).length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3 rounded-2xl border border-[var(--border)]">
          <Users className="w-10 h-10 text-[var(--muted-foreground)] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            {statusFilter === 'ACTIVE' ? 'No active specialists registered' : 'No archived or terminated staff'}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">
            {statusFilter === 'ACTIVE'
              ? 'Register your first barber or stylist specialist to begin assigning appointments and shifts.'
              : 'Specialists who are archived or terminated will appear here.'}
          </p>
          {statusFilter === 'ACTIVE' && (
            <button
              onClick={() => {
                openAddStaffModal('STAFF');
              }}
              className="btn-primary px-5 py-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Specialist</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {staffList
            .filter((stf) =>
              statusFilter === 'ACTIVE'
                ? stf.status !== 'ARCHIVED' && stf.status !== 'TERMINATED'
                : stf.status === 'ARCHIVED' || stf.status === 'TERMINATED'
            )
            .map((stf) => {
              const isStoreAdmin =
                (stf.roleTitle || '').toLowerCase().includes('admin') ||
                (stf.roleTitle || '').toLowerCase().includes('manager');

              return (
                <div
                  key={stf.staffId}
                  className={`glass-card p-5 rounded-2xl border hover:shadow-md transition-all flex flex-col justify-between h-full ${
                    isStoreAdmin
                      ? 'border-purple-200 dark:border-purple-900/40 bg-purple-50/10'
                      : 'border-[var(--border)]'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                            isStoreAdmin
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-500'
                              : 'bg-gradient-to-tr from-[var(--primary)] to-rose-400'
                          }`}
                        >
                          {(stf.fullName || '?').charAt(0)}
                        </div>
                        <div className="space-y-0.5">
                          <h3 className="text-sm font-black text-[var(--foreground)] leading-tight">{stf.fullName}</h3>
                          <span
                            className={`text-xs font-bold block ${
                              isStoreAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-[var(--primary)]'
                            }`}
                          >
                            {stf.roleTitle || stf.role || 'Barber Specialist'}
                          </span>
                          <span className="text-[11px] text-[var(--muted-foreground)] block">
                            {scheduleSummary(allSchedules.filter((w) => w.entityId === stf.staffId))}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isStoreAdmin
                                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 border-blue-200'
                              }`}
                            >
                              {isStoreAdmin ? (
                                <Shield className="w-3 h-3 text-purple-600" />
                              ) : (
                                <Scissors className="w-3 h-3 text-blue-600" />
                              )}
                              {isStoreAdmin ? 'Store Admin' : 'Specialist'}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isArchivedStaff(stf.status)
                                  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200'
                                  : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200'
                              }`}
                            >
                              <ShieldCheck className="w-3 h-3" />
                              {stf.status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingStaff(stf);
                            setSystemRole(isStoreAdmin ? 'ADMIN' : 'STAFF');
                            setFullName(stf.fullName || '');
                            setEmail(stf.email || '');
                            setPhone(stf.phone || '');
                            setRoleTitle(stf.roleTitle || stf.role || 'Barber Specialist');
                            setCreateLoginUser(false);
                            setStaffPassword('');
                            setShowAddModal(true);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                          title="Edit Profile"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleArchive(stf)}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-rose-600 hover:bg-rose-50"
                          title={isArchivedStaff(stf.status) ? 'Restore' : 'Archive'}
                        >
                          {isArchivedStaff(stf.status) ? (
                            <RotateCcw className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                <div className="space-y-1 pt-2 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] font-semibold min-h-[46px]">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <span>{stf.email || '—'}</span>
                  </div>
                  {stf.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                      <span>{stf.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                {isArchivedStaff(stf.status) ? (
                  <button
                    type="button"
                    onClick={() => handleToggleArchive(stf)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Specialist to Active</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openExpertiseModal(stf)}
                      className="py-2 px-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Skills / Services</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openScheduleModal(stf)}
                      className="py-2 px-2.5 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)] transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-[var(--primary)]" />
                      <span>Shift Hours</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          editingStaff
            ? `Edit Profile: ${editingStaff.fullName}`
            : systemRole === 'ADMIN'
            ? 'Add Store Administrator'
            : 'Register Specialist / Staff'
        }
        maxWidth="md"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          {/* Access / System Role */}
          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1.5">
              Account Type & System Access
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setSystemRole('STAFF');
                  if (roleTitle === 'Store Administrator') setRoleTitle('Barber Specialist');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  systemRole === 'STAFF'
                    ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--foreground)] ring-1 ring-[var(--primary)] shadow-xs'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-[var(--foreground)]">
                  <Scissors className="w-3.5 h-3.5 text-[var(--primary)]" />
                  <span>Specialist Staff</span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-medium leading-tight">
                  Appointments, customer CRM, and shift scheduling.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystemRole('ADMIN');
                  setCreateLoginUser(true);
                  if (roleTitle === 'Barber Specialist') setRoleTitle('Store Administrator');
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  systemRole === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/40 text-[var(--foreground)] ring-1 ring-purple-500 shadow-xs'
                    : 'border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs text-purple-700 dark:text-purple-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Store Admin</span>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1 font-medium leading-tight">
                  Job title only for now: only the shop owner has full access (Money Book, Expenses, Payroll, Settings).
                </p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Elena Rostova"
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
                placeholder="elena@bdiamond.com"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Role Title</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
                placeholder="e.g. Master Stylist"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Employment</label>
              <select
                value={employmentType}
                onChange={(e: any) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)] focus:outline-none"
              >
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>

          {editingStaff && !editingStaff.userId && (
            <p className="p-3 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
              <strong className="text-[var(--foreground)]">No login yet.</strong> To let them sign in, archive them and add them again
              with &ldquo;Create a login&rdquo; ticked.
            </p>
          )}

          {!editingStaff && (
            <div className="p-3 rounded-xl bg-[var(--muted)] space-y-2 border border-[var(--border)]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--foreground)]">
                <input
                  type="checkbox"
                  checked={createLoginUser}
                  onChange={(e) => setCreateLoginUser(e.target.checked)}
                  className="rounded text-[var(--primary)]"
                />
                <span>Create a login so they can sign in (with their email)</span>
              </label>
              {createLoginUser && (
                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="e.g. Barber#2026x"
                      autoComplete="new-password"
                      className="w-full pl-3 pr-10 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title={showStaffPassword ? 'Hide password' : 'Show password'}
                    >
                      {showStaffPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className={`text-[11px] mt-1 ${staffPassword && !isStrongPassword(staffPassword) ? 'text-rose-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                    {PASSWORD_RULES}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingStaff}
              className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
            >
              {isSubmittingStaff ? 'Saving...' : editingStaff ? 'Update Specialist' : 'Save Specialist'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Configure Weekly Shift Hours Modal */}
      {selectedStaffForSchedule && (
        <Modal
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          title={`Shift Schedule — ${selectedStaffForSchedule.fullName}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)] font-medium">
              Configure operational working shift hours for Downtown Main Branch.
            </p>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {DAYS_OF_WEEK.map((d) => {
                const isActive = shiftActiveDays[d.dayIndex] ?? true;
                return (
                  <div
                    key={d.dayIndex}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-[var(--card)] border-[var(--border)]'
                        : 'bg-[var(--muted)]/50 border-transparent opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) =>
                          setShiftActiveDays((prev) => ({ ...prev, [d.dayIndex]: e.target.checked }))
                        }
                        className="rounded text-[var(--primary)] w-4 h-4"
                      />
                      <span className="text-xs font-black text-[var(--foreground)]">{d.name}</span>
                    </div>

                    {isActive ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={shiftStartTimes[d.dayIndex] || '09:00'}
                          onChange={(e) =>
                            setShiftStartTimes((prev) => ({
                              ...prev,
                              [d.dayIndex]: e.target.value.includes(':') ? `${e.target.value}:00` : e.target.value,
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                        />
                        <span className="text-xs font-bold text-[var(--muted-foreground)]">to</span>
                        <input
                          type="time"
                          value={shiftEndTimes[d.dayIndex] || '18:00'}
                          onChange={(e) =>
                            setShiftEndTimes((prev) => ({
                              ...prev,
                              [d.dayIndex]: e.target.value.includes(':') ? `${e.target.value}:00` : e.target.value,
                            }))
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[var(--muted-foreground)]">Day Off / Closed</span>
                    )}

                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                        isActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                      }`}
                    >
                      {isActive ? 'Active Shift' : 'Off Duty'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeeklySchedule}
                disabled={isSubmittingSchedule}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingSchedule ? 'Saving...' : 'Save Weekly Shifts'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Specialist Expertise & Service Mapping Modal */}
      {selectedStaffForExpertise && (
        <Modal
          isOpen={showExpertiseModal}
          onClose={() => setShowExpertiseModal(false)}
          title={`Services & Skills — ${selectedStaffForExpertise.fullName}`}
          maxWidth="md"
        >
          <div className="space-y-5">
            {/* List of mapped expertise */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-[var(--foreground)]">Assigned Salon Services</h4>
              {staffExpertiseList.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] p-3 rounded-xl bg-[var(--muted)] text-center">
                  No services assigned yet. Specialist can perform all general offerings or assign below.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
                  {staffExpertiseList.map((exp: any) => {
                    const matchedService = services.find(
                      (s) => s.serviceId === exp.serviceId || s.serviceId === exp.expertiseId
                    );
                    const displayName =
                      exp.expertise?.name ||
                      exp.name ||
                      matchedService?.name ||
                      exp.serviceName ||
                      exp.expertiseName ||
                      'Specialized Service';
                    const displayLevel =
                      exp.proficiencyLevel || exp.experienceLevel || exp.level || 'ADVANCED';

                    return (
                      <div
                        key={exp.staffExpertiseId || exp.id || exp.expertiseId}
                        className="p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-[var(--foreground)] block">
                            {displayName}
                          </span>
                          <span className="text-[10px] font-bold text-[var(--primary)] uppercase">
                            Level: {displayLevel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteExpertise(exp)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Remove Skill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Map new service skill */}
            <form onSubmit={handleAddExpertise} className="p-4 rounded-2xl bg-[var(--muted)] space-y-3">
              <h4 className="text-xs font-black text-[var(--foreground)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <span>Assign Service Capability</span>
              </h4>

              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  Select Service
                </label>
                {services.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200">
                    No services in catalog yet. Please add a service under{' '}
                    <a href="/admin/services" className="font-bold underline text-[var(--primary)]">
                      Services Catalog
                    </a>{' '}
                    first.
                  </div>
                ) : (
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                  >
                    {services.map((s) => (
                      <option key={s.serviceId} value={s.serviceId}>
                        {s.name} (${formatMoney(s.price)} CAD)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--muted-foreground)] mb-1">
                  Proficiency Level
                </label>
                <select
                  value={proficiencyLevel}
                  onChange={(e: any) => setProficiencyLevel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                >
                  <option value="ADVANCED">Advanced Stylist</option>
                  <option value="EXPERT">Expert / Master Barber</option>
                  <option value="BEGINNER">Junior / Apprentice</option>
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingExpertise}
                  className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
                >
                  {isSubmittingExpertise ? 'Assigning...' : 'Assign Skill'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
