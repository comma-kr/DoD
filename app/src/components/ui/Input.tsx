import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = '', ...rest },
  ref
) {
  return (
    <label className="flex w-full flex-col gap-2">
      {label ? (
        <span className="text-sm text-foreground-sub">{label}</span>
      ) : null}
      <input
        ref={ref}
        className={`h-12 w-full rounded-xl border border-border bg-surface px-4 text-foreground placeholder:text-foreground-sub focus:border-primary focus:outline-none ${
          error ? 'border-red-500' : ''
        } ${className}`}
        {...rest}
      />
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </label>
  );
});

export default Input;
