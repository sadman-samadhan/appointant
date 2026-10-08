'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import {
  Lock,
  Mail,
  Shield,
  User,
  Scissors,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, forgotPassword, verifyOtp, resetPassword } = useAuth();
  const { settings } = useTheme();
  const { showError, showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Sign In Form States
  const [loginUserid, setLoginUserid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up Form States
  const [regName, setRegName] = useState('');
  const [regUserid, setRegUserid] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotUserid, setForgotUserid] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  // Password validation criteria checks
  const passwordCriteria = {
    minLength: regPassword.length >= 10,
    hasUpper: /[A-Z]/.test(regPassword),
    hasLower: /[a-z]/.test(regPassword),
    hasNumber: /[0-9]/.test(regPassword),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(regPassword),
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUserid.trim() || !loginPassword.trim()) {
      showError('Input Required', 'Please enter both User ID and password.');
      return;
    }
    setIsLoading(true);
    try {
      const userProfile = await login(loginUserid.trim(), loginPassword);
      showSuccess('Authenticated Successfully', `Welcome back to ${settings.siteName}!`);
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;
      if (safeNext && (!safeNext.startsWith('/admin') || userProfile.role !== 'CUSTOMER')) {
        router.push(safeNext);
      } else if (userProfile.role === 'ADMIN' || userProfile.role === 'STAFF') {
        router.push('/admin/dashboard');
      } else {
        router.push('/customer/profile');
      }
    } catch (err: any) {
      showError('Authentication Failed', err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regUserid.trim() || !regPassword) {
      showError('Input Required', 'Please fill in all registration fields.');
      return;
    }
    if (!isPasswordValid) {
      showError(
        'Password Too Weak',
        'Password must be at least 10 characters and contain an uppercase letter, lowercase letter, number, and special character.'
      );
      return;
    }
    if (regPassword !== regConfirmPassword) {
      showError('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      await register({
        name: regName.trim(),
        userid: regUserid.trim(),
        password: regPassword,
      });
      showSuccess('Account Created!', 'Please sign in with your new credentials.');
      setLoginUserid(regUserid.trim());
      setLoginPassword('');
      setActiveTab('login');
    } catch (err: any) {
      showError('Registration Failed', err.message || 'Could not register user account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Steps
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      await forgotPassword(forgotUserid.trim());
      showSuccess('OTP Sent', `Verification code dispatched for ${forgotUserid}`);
      setForgotStep('verify');
    } catch (err: any) {
      showError('Request Failed', err.message || 'Could not request password OTP');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotLoading(true);
    try {
      const res = await verifyOtp(forgotUserid.trim(), otpCode.trim());
      if (res && res.resetToken) {
        setResetToken(res.resetToken);
        showSuccess('OTP Verified', 'Please enter your new password.');
        setForgotStep('reset');
      } else {
        throw new Error('Reset token missing in response');
      }
    } catch (err: any) {
      showError('Verification Failed', err.message || 'Invalid or expired OTP code');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 10) {
      showError('Password Criteria', 'New password must be at least 10 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showError('Mismatch', 'New passwords do not match');
      return;
    }
    setIsForgotLoading(true);
    try {
      await resetPassword({
        resetToken,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      showSuccess('Password Updated', 'Your password has been reset. Please sign in.');
      setShowForgotModal(false);
      setForgotStep('request');
      setLoginUserid(forgotUserid);
    } catch (err: any) {
      showError('Reset Failed', err.message || 'Failed to reset password');
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl w-full mb-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-3 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[var(--primary)]" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden glass-card shadow-2xl border border-[var(--border)]">
        {/* Left Branded Hero Panel */}
        <div className="p-8 lg:p-12 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {settings.siteName}
            </h1>
            <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-medium">
              {settings.tagline} — Fredericton Downtown Main Branch
            </p>
          </div>

          <div className="space-y-3 relative z-10 pt-8 border-t border-white/10 text-xs opacity-90">
            <div className="flex items-center gap-2 font-bold">
              <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Authorized Salon & Customer Portal</span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">
              Enterprise security encryption protecting customer appointment records and salon transactions.
            </p>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        </div>

        {/* Right Form Panel */}
        <div className="p-8 lg:p-12 space-y-6 bg-[var(--card)] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Tab switch: Sign In vs Sign Up */}
            <div className="flex items-center border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className={`text-sm font-black transition-all pb-1 border-b-2 ${
                    activeTab === 'login'
                      ? 'border-[var(--primary)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className={`text-sm font-black transition-all pb-1 border-b-2 ${
                    activeTab === 'register'
                      ? 'border-[var(--primary)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Sign In Tab */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    User ID / Email / Phone
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginUserid}
                      onChange={(e) => setLoginUserid(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      placeholder="e.g. admin@system.com or user@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[var(--foreground)]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotUserid(loginUserid);
                        setForgotStep('request');
                        setShowForgotModal(true);
                      }}
                      className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-4"
                >
                  <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Sign Up Tab */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">User ID / Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. john@example.com"
                      value={regUserid}
                      onChange={(e) => setRegUserid(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 10 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-3" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Confirm your password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                      title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Password Criteria Real-Time Indicator */}
                <div className="p-3 rounded-xl bg-[var(--muted)] space-y-1.5 text-[10px] font-semibold">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-wider block">
                    Password Requirements
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[11px]">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.minLength ? 'text-emerald-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.minLength ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--border)]'}`}>
                        {passwordCriteria.minLength ? '✓' : '•'}
                      </span>
                      <span>Min 10 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasUpper ? 'text-emerald-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasUpper ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--border)]'}`}>
                        {passwordCriteria.hasUpper ? '✓' : '•'}
                      </span>
                      <span>1 Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasLower ? 'text-emerald-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasLower ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--border)]'}`}>
                        {passwordCriteria.hasLower ? '✓' : '•'}
                      </span>
                      <span>1 Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasNumber ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--border)]'}`}>
                        {passwordCriteria.hasNumber ? '✓' : '•'}
                      </span>
                      <span>1 Number (0-9)</span>
                    </div>
                    <div className={`col-span-2 flex items-center gap-1.5 ${passwordCriteria.hasSpecial ? 'text-emerald-600 font-bold' : 'text-[var(--muted-foreground)]'}`}>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${passwordCriteria.hasSpecial ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--border)]'}`}>
                        {passwordCriteria.hasSpecial ? '✓' : '•'}
                      </span>
                      <span>1 Special Character (!@#$%^&*...)</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Account...' : 'Register Account'}</span>
                </button>
              </form>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border)] text-center">
            <p className="text-[11px] text-[var(--muted-foreground)] font-medium">
              © {settings.siteName} • Downtown Fredericton, NB
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        title="Reset Account Password"
        maxWidth="sm"
      >
        {forgotStep === 'request' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              Enter your registered User ID or email. An OTP verification code will be dispatched.
            </p>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">User ID / Email</label>
              <input
                type="text"
                required
                value={forgotUserid}
                onChange={(e) => setForgotUserid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                placeholder="e.g. user@example.com"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isForgotLoading}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
              >
                {isForgotLoading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </div>
          </form>
        )}

        {forgotStep === 'verify' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-[var(--muted-foreground)]">
              Enter the OTP code received for <strong>{forgotUserid}</strong>.
            </p>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Verification OTP</label>
              <input
                type="text"
                required
                placeholder="4 or 6 digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-sm font-black text-[var(--foreground)] tracking-widest text-center"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setForgotStep('request')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isForgotLoading}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
              >
                {isForgotLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          </form>
        )}

        {forgotStep === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>OTP verified. Enter your new password.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">New Password (Min 10 chars)</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--muted)] text-[var(--foreground)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isForgotLoading}
                className="btn-primary px-4 py-2 rounded-xl text-xs font-bold"
              >
                {isForgotLoading ? 'Saving...' : 'Set New Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
