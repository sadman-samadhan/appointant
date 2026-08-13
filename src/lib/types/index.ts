// Auth Types
export interface LoginRequest {
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
  status?: string;
  image?: string;
  roleName?: string;
  roleCode?: string;
  role?: 'ADMIN' | 'CUSTOMER' | 'STAFF';
}

export interface RegisterRequest {
  name: string;
  userid: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// Staff Types
export interface StaffExpertiseDto {
  id: string;
  expertiseName: string;
  level?: string;
}

export interface StaffResponseDto {
  staffId: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  primaryBranchId?: string;
  expertise?: StaffExpertiseDto[];
  profilePhotoUrl?: string;
}

// Service Types
export interface ServiceCategoryDto {
  categoryId: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: ServiceCategoryDto[];
}

export interface ServiceDto {
  serviceId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  categoryId?: string;
  categoryName?: string;
  status?: string;
  imageUrl?: string;
}

// Booking Types
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
  customerName: string;
  serviceName: string;
  staffName?: string;
  startTime: string;
  endTime?: string;
  status: BookingStatus;
  totalAmount: number;
  currency?: string;
}

export interface ListBookingsResponseDto {
  items: BookingListItemDto[];
  page: number;
  limit: number;
  total: number;
}

// Payment & Invoice Types
export interface PaymentResponseDto {
  paymentId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: string;
  currency: string;
  status: string;
  createdAt: string;
}

export interface InvoiceDto {
  invoiceId: string;
  bookingId?: string;
  customerName?: string;
  totalAmount: number;
  paidAmount: number;
  status: 'PAID' | 'UNPAID' | 'PARTIAL' | 'VOID';
  createdAt: string;
}

// Accounting Types
export interface AccountDto {
  accountId: string;
  accountCode: string;
  accountName: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  isDisabled?: boolean;
}

export interface TrialBalanceDto {
  accounts: { accountCode: string; accountName: string; debit: number; credit: number }[];
  totalDebit: number;
  totalCredit: number;
}

// Expense Types
export interface ExpenseCategoryDto {
  categoryId: string;
  name: string;
  description?: string;
}

export interface ExpenseDto {
  expenseId: string;
  title: string;
  amount: number;
  categoryName?: string;
  categoryId?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
  receiptUrl?: string;
  createdAt: string;
}

// Payroll Types
export interface PayrollDto {
  payrollId: string;
  staffId: string;
  staffName: string;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  commission: number;
  totalAmount: number;
  status: 'DRAFT' | 'PAID' | 'REVERSED';
}

// Customer CRM Types
export interface CustomerDto {
  customerId: string;
  fullName: string;
  email?: string;
  phone?: string;
  totalVisits?: number;
  totalSpent?: number;
  tags?: string[];
  notes?: string[];
}
