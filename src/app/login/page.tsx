'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { Lock, Mail, Shield, User, Scissors, ArrowRight, UserPlus, KeyRound, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, register, forgotPassword, verifyOtp, resetPassword } = useAuth();
  const { settings } = useTheme();
  const { showError, showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [targetRole, setTargetRole] = useState<'ADMIN' | 'CUSTOMER'>('ADMIN');
  const [isLoading, setIsLoading] = useState(false);

  // Sign In Form States
  const [loginUserid, setLoginUserid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up Form States
  const [regName, setRegName] = useState('');
  const [regUserid, setRegUserid] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify' | 'reset'>('request');
  const [forgotUserid, setForgotUserid] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUserid.trim() || !loginPassword.trim()) {
      showError('Input Required', 'Please enter both User ID and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login(loginUserid.trim(), loginPassword, targetRole);
      showSuccess('Authenticated Successfully', `Welcome back to ${settings.siteName}!`);
      if (targetRole === 'ADMIN') {
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 sm:p-6 lg:p-8 animate-fade-in">
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

          <div className="space-y-3 relative z-10 pt-8 border-t border-white/10 text-xs opacity-80">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-300" />
              <span>Multi-Tenant Auth & Access Layer (Port 3302)</span>
            </div>
            <p>Phase 1 Cash Register & Appointment Scheduling System.</p>
          </div>

          {/* Decorative background circle */}
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        </div>

        {/* Right Form Panel */}
        <div className="p-8 lg:p-12 space-y-6 bg-[var(--card)] flex flex-col justify-between">
          <div className="space-y-4">
            {/* Tab switch: Sign In vs Sign Up */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-4">
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

              {/* Target Portal selector */}
              <div className="flex items-center gap-1 bg-[var(--muted)] p-1 rounded-xl border border-[var(--border)] text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setTargetRole('ADMIN')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    targetRole === 'ADMIN'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs font-black'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setTargetRole('CUSTOMER')}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    targetRole === 'CUSTOMER'
                      ? 'bg-[var(--card)] text-[var(--foreground)] shadow-xs font-black'
                      : 'text-[var(--muted-foreground)]'
                  }`}
                >
                  Client
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
                      placeholder="e.g. admin@system.com"
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
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 mt-2"
                >
                  <span>{isLoading ? 'Authenticating...' : `Sign In as ${targetRole === 'ADMIN' ? 'Owner / Admin' : 'Customer'}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Quick Fill Presets */}
                <div className="pt-3 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold text-[var(--muted-foreground)] block mb-1.5 uppercase tracking-wider">
                    Quick Sign-In Presets
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginUserid('bdiamond.owner@system.com');
                        setLoginPassword('123456789');
                        setTargetRole('ADMIN');
                      }}
                      className="p-2 rounded-xl text-left bg-[var(--muted)] hover:bg-[var(--border)] border border-[var(--border)] transition-all"
                    >
                      <div className="font-bold text-[11px] text-[var(--foreground)] flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[var(--primary)]" />
                        <span>Salon Owner</span>
                      </div>
                      <div className="text-[9px] text-[var(--muted-foreground)] truncate">
                        bdiamond.owner@system.com
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLoginUserid('elena@bd.com');
                        setLoginPassword('123456789');
                        setTargetRole('ADMIN');
                      }}
                      className="p-2 rounded-xl text-left bg-[var(--muted)] hover:bg-[var(--border)] border border-[var(--border)] transition-all"
                    >
                      <div className="font-bold text-[11px] text-[var(--foreground)] flex items-center gap-1">
                        <Scissors className="w-3 h-3 text-blue-600" />
                        <span>Staff Specialist</span>
                      </div>
                      <div className="text-[9px] text-[var(--muted-foreground)] truncate">
                        elena@bd.com
                      </div>
                    </button>
                  </div>
                </div>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Confirm</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-semibold text-[var(--foreground)] focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
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
              Live Core Backend (Port 3301) • Auth Service (Port 3302)
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
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--foreground)] mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border-strong)] text-xs font-bold text-[var(--foreground)]"
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
                {isForgotLoading ? 'Saving...' : 'Set New Password'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
