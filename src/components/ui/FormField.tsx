import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function FormField({ label, error, required, hint, className, children, id }: FormFieldProps) {
  return (
    <div className={clsx('flex flex-col gap-1', className)}>
      <label className="label" htmlFor={id}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-slate-500 text-xs">{hint}</p>}
      {error && <p className="error-msg" role="alert">{error}</p>}
    </div>
  );
}

// ─── Input ─────────────────────────────────────────────────────

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx('input', error && 'input-error', className)}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// ─── Textarea ──────────────────────────────────────────────────

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx('input resize-none', error && 'input-error', className)}
      rows={3}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

// ─── Select ────────────────────────────────────────────────────

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, options, placeholder, className, ...props }, ref) => (
    <select
      ref={ref}
      className={clsx('input', error && 'input-error', className)}
      {...props}
    >
      {placeholder && (
        <option value="" className="bg-slate-800">{placeholder}</option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-800">
          {o.label}
        </option>
      ))}
    </select>
  )
);
Select.displayName = 'Select';
