import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, Eye, EyeOff, User, Mail, Lock, BadgeCheck } from 'lucide-react';
import { FormField, Input } from '../components/ui/FormField';
import { authService } from '../services/authService';
import { registerSchema, type RegisterFormData } from '../schemas';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    try {
      await authService.register({
        displayName: data.displayName,
        email: data.email,
        studentId: data.studentId,
        password: data.password,
      });
      toast.success('Account created! Welcome to NextGen Library.');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('email-already-in-use')) {
        toast.error('An account with this email already exists.');
      } else if (msg.includes('weak-password')) {
        toast.error('Password is too weak. Use at least 6 characters.');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <BookOpen size={24} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 text-sm mt-1">Join the college library community</p>
        </div>

        <div className="card p-6">
          <form id="register-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField label="Full Name" error={errors.displayName?.message} required id="reg-name">
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  className="pl-9"
                  error={!!errors.displayName}
                  {...register('displayName')}
                />
              </div>
            </FormField>

            <FormField label="Student ID" error={errors.studentId?.message} id="reg-student-id" hint="Optional but recommended">
              <div className="relative">
                <BadgeCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="reg-student-id"
                  type="text"
                  placeholder="e.g. STU-12345"
                  className="pl-9"
                  error={!!errors.studentId}
                  {...register('studentId')}
                />
              </div>
            </FormField>

            <FormField label="Email address" error={errors.email?.message} required id="reg-email">
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@college.edu"
                  className="pl-9"
                  error={!!errors.email}
                  {...register('email')}
                />
              </div>
            </FormField>

            <FormField label="Password" error={errors.password?.message} required id="reg-password">
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  className="pl-9 pr-9"
                  error={!!errors.password}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </FormField>

            <FormField label="Confirm Password" error={errors.confirmPassword?.message} required id="reg-confirm-password">
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  id="reg-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  className="pl-9"
                  error={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
              </div>
            </FormField>

            <p className="text-xs text-slate-500">
              By registering, you agree to the library's terms of use.
              Student accounts cannot grant themselves librarian privileges.
            </p>

            <button
              type="submit"
              id="register-submit-btn"
              disabled={loading}
              className="btn-primary w-full justify-center"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
