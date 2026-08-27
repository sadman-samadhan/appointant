// ==========================================
// 1. Auth & User Types (Port 3302)
// ==========================================

export interface LoginRequest {
  userid: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  userid: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface UserProfile {
  id?: number | string;
  name: string;
  userid: string;
  email?: string;
  mobile?: string;
  phone?: string;
  status?: string;
  image?: string;
  roleName?: string;
  roleCode?: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'STAFF';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  userid: string;
}

export interface VerifyOtpRequest {
  userid: string;
  otp: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// ==========================================
// 2. Staff & Availability Types (Port 3301)
// ==========================================

export interface StaffExpertiseDto {
  id?: string;
  staffExpertiseId?: string;
  serviceId?: string;
  serviceName?: string;
  expertiseName?: string;
  experienceLevel?: 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT' | 'MASTER';
  level?: string;
  isPrimary?: boolean;
  commissionRate?: number;
  customDurationMinutes?: number;
  customPrice?: number;
}

export interface StaffResponseDto {
  staffId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  role?: string;
  roleTitle?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  status?: string;
  hireDate?: string;
  notes?: string;
  primaryBranchId?: string;
  expertise?: StaffExpertiseDto[];
  profilePhotoUrl?: string;
}

export interface CreateStaffDto {
  tenantId: string;
  fullName: string;
  email: string;
  phone?: string;
  roleTitle?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  hireDate?: string;
  notes?: string;
  createUser?: boolean;
  password?: string;
}

export interface WeeklyScheduleDto {
  scheduleId?: string;
  id?: string;
  entityType: 'BRANCH' | 'STAFF' | 'RESOURCE';
  entityId: string;
  branchId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday ... 6=Saturday
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  isActive?: boolean;
  recurrenceRule?: string;
}

export interface UnifiedSlotDto {
  slotId?: string;
  startTime: string; // ISO or HH:MM:SS
  endTime: string;
  staffId?: string;
  staffName?: string;
  available: boolean;
}

export interface ReserveSlotDto {
  slotId?: string;
  tenantId: string;
  branchId: string;
  serviceId: string;
  customerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
  preferredStaffId?: string;
  staffId?: string;
  resourceIds?: string[];
  ttlMinutes?: number;
}

export interface ReserveSlotResponseDto {
  reservationId: string;
  expiresAt: string;
  status: string;
}

// ==========================================
// 3. Service & Category Types (Port 3301)
// ==========================================

export interface ServiceCategoryDto {
  categoryId: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: ServiceCategoryDto[];
}

export interface CreateServiceCategoryDto {
  name: string;
  description?: string;
  parentId?: string;
}

export interface ServiceDto {
  serviceId: string;
  id?: string;
  tenantId?: string;
  branchId?: string;
  name: string;
  description?: string;
  price: number;
  basePrice?: number;
  durationMinutes: number;
  baseDurationMinutes?: number;
  categoryId?: string;
  categoryName?: string;
  status?: string;
  currency?: string;
  isOnlineBookable?: boolean;
  requiresStaff?: boolean;
  bookingType?: 'APPOINTMENT' | 'WALKIN' | 'GROUP';
  imageUrl?: string;
  addons?: ServiceAddonDto[];
}

export interface CreateServiceDto {
  tenantId: string;
  branchId: string;
  categoryId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  baseDurationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  basePrice: number;
  priceVisible?: boolean;
  currency?: string;
  bookingType?: 'APPOINTMENT' | 'WALKIN' | 'GROUP';
  isOnlineBookable?: boolean;
  requiresStaff?: boolean;
  requiresResource?: boolean;
  maxCapacity?: number;
}

export interface ServiceAddonDto {
  addonId: string;
  serviceId?: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive?: boolean;
}

export interface CreateServiceAddonDto {
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
}

// ==========================================
// 4. Booking & Appointment Types (Port 3301)
// ==========================================

export type BookingStatus =
  | 'DRAFT'
  | 'LOCKED'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface BookingListItemDto {
  bookingId: string;
  id?: string;
  tenantId?: string;
  branchId?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceId?: string;
  serviceName: string;
  staffId?: string;
  staffName?: string;
  startTime: string;
  endTime?: string;
  status: BookingStatus;
  totalAmount: number;
  currency?: string;
  notes?: string;
  createdAt?: string;
}

export interface CreateBookingDto {
  tenantId: string;
  branchId: string;
  customerId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM:SS
  endTime?: string; // HH:MM:SS
  reservationId?: string;
  resourceIds?: string[];
  notes?: string;
}

export interface ConfirmBookingDto {
  vatAmount?: number;
  tipAmount?: number;
  discountAmount?: number;
  note?: string;
}

export interface CheckinBookingDto {
  staffId?: string;
  resourceIds?: string[];
}

export interface RescheduleBookingDto {
  newReservationId?: string;
  date: string;
  startTime: string;
  endTime?: string;
}

export interface DraftInvoiceFromBookingDto {
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  terms?: string;
  currency?: string;
  taxRate?: number;
  tipAmount?: number;
  consumableAmount?: number;
  otherAmount?: number;
  discountAmount?: number;
}

export interface ListBookingsResponseDto {
  items: BookingListItemDto[];
  page: number;
  limit: number;
  total: number;
}

// ==========================================
// 5. Billing, Invoices & Payments (Port 3301)
// ==========================================

export interface InvoiceItemDto {
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface InvoiceDto {
  invoiceId: string;
  id?: string;
  invoiceNumber?: string;
  bookingId?: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  balance?: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'VOID' | 'DRAFT';
  currency?: string;
  issueDate?: string;
  dueDate?: string;
  notes?: string;
  items?: InvoiceItemDto[];
  createdAt: string;
}

export interface CreateInvoiceDto {
  customerId: string;
  bookingId?: string;
  issueDate: string;
  dueDate?: string;
  currency?: string;
  notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}

export interface RecordPaymentDto {
  customerId: string;
  invoiceId?: string;
  amount: number;
  currency?: string;
  paymentMethod: 'CASH' | 'CHECK' | 'BANK_TRANSFER';
  paymentDate: string; // YYYY-MM-DD
  referenceNumber?: string;
  notes?: string;
  idempotencyKey: string;
}

export interface PaymentResponseDto {
  paymentId: string;
  id?: string;
  invoiceId?: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentMethod: string;
  currency: string;
  status: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface RefundPaymentDto {
  amount: number;
  reason?: string;
}

// ==========================================
// 6. Accounting & General Ledger (Port 3301)
// ==========================================

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE' | 'DIVIDENDS';

export interface AccountDto {
  accountId: string;
  id?: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  type?: AccountType;
  balance: number;
  parentAccountId?: string;
  isActive?: boolean;
  isDisabled?: boolean;
}

export interface CreateAccountDto {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountId?: string;
}

export interface JournalLineDto {
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalDto {
  journalId: string;
  id?: string;
  branchId?: string;
  entryNumber?: string;
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceId?: string;
  lines: JournalLineDto[];
  createdAt?: string;
}

export interface CreateJournalDto {
  branchId?: string;
  description: string;
  entryDate: string;
  lines: JournalLineDto[];
}

export interface TrialBalanceAccountDto {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface TrialBalanceDto {
  accounts: TrialBalanceAccountDto[];
  totalDebit: number;
  totalCredit: number;
}

// ==========================================
// 7. Expenses (Port 3301)
// ==========================================

export interface ExpenseCategoryDto {
  categoryId: string;
  categoryName?: string;
  name?: string;
  description?: string;
  accountId?: string;
  requiresReceipt?: boolean;
}

export interface CreateExpenseCategoryDto {
  categoryName: string;
  description?: string;
  accountId?: string;
  requiresReceipt?: boolean;
}

export interface ExpenseDto {
  expenseId: string;
  id?: string;
  branchId?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  title?: string;
  amount: number;
  currency?: string;
  expenseDate?: string;
  paymentMethod?: 'CASH' | 'PERSONAL_CARD' | 'COMPANY_CARD' | 'BANK_TRANSFER';
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  createdAt: string;
}

export interface CreateExpenseDto {
  branchId: string;
  categoryId: string;
  description: string;
  amount: number;
  currency?: string;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: 'CASH' | 'PERSONAL_CARD' | 'COMPANY_CARD' | 'BANK_TRANSFER';
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
}

// ==========================================
// 8. Payroll (Port 3301)
// ==========================================

export interface PayrollDto {
  payrollId: string;
  id?: string;
  staffId: string;
  staffName?: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  bonus?: number;
  commission?: number;
  deductions?: number;
  totalAmount: number;
  status: 'DRAFT' | 'PAID' | 'REVERSED';
  notes?: string;
  createdAt?: string;
}

export interface CreatePayrollDto {
  staffId: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  bonus?: number;
  deductions?: number;
  notes?: string;
}

export interface PayPayrollDto {
  paymentAccountId: string;
}

// ==========================================
// 9. Customers & CRM (Port 3301)
// ==========================================

export interface CustomerContactDto {
  contactId?: string;
  type: 'PHONE' | 'EMAIL' | 'WHATSAPP';
  value: string;
  isPrimary: boolean;
  isVerified?: boolean;
}

export interface CustomerDto {
  customerId: string;
  id?: string;
  userId?: string;
  customerCode?: string;
  fullName: string;
  email?: string;
  phone?: string;
  contacts?: CustomerContactDto[];
  totalVisits?: number;
  totalSpent?: number;
  tags?: string[];
  notes?: string[];
  createdAt?: string;
}

export interface CreateCustomerDto {
  userId?: string;
  fullName: string;
  contacts: { type: 'PHONE' | 'EMAIL' | 'WHATSAPP'; value: string; isPrimary: boolean }[];
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  profilePhotoUrl?: string;
}

export interface TenantCustomerDto {
  tenantCustomerId?: string;
  customerId: string;
  tenantId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  totalVisits?: number;
  totalSpent?: number;
  tag?: string;
  tags?: string[];
  preferredBranchId?: string;
  createdAt?: string;
}

export interface LinkTenantCustomerDto {
  customerId: string;
  preferredBranchId?: string;
}

export interface CustomerNoteDto {
  noteId: string;
  note: string;
  createdBy?: string;
  createdAt: string;
}
