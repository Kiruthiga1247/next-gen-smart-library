import { Search, X } from 'lucide-react';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

interface SearchBarProps {
  defaultValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  autoFocus?: boolean;
  navigateOnSubmit?: boolean;
}

export function SearchBar({
  defaultValue = '',
  onSearch,
  placeholder = 'Search by title, author, ISBN, category…',
  size = 'md',
  className,
  autoFocus = false,
  navigateOnSubmit = false,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = value.trim();
      if (navigateOnSubmit) {
        navigate(`/search?q=${encodeURIComponent(q)}`);
      } else {
        onSearch?.(q);
      }
    },
    [value, onSearch, navigate, navigateOnSubmit]
  );

  const handleClear = () => {
    setValue('');
    onSearch?.('');
  };

  const sizeClasses = {
    sm: 'h-9 text-sm pl-9 pr-8',
    md: 'h-11 text-sm pl-11 pr-10',
    lg: 'h-14 text-base pl-14 pr-12',
  };

  const iconSizes = { sm: 14, md: 16, lg: 20 };

  return (
    <form onSubmit={handleSubmit} role="search" className={clsx('relative', className)}>
      <div className="relative">
        {/* Search icon */}
        <Search
          size={iconSizes[size]}
          className={clsx(
            'absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none',
            size === 'lg' && 'left-4'
          )}
        />

        <input
          id="search-input"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          className={clsx(
            'input w-full',
            sizeClasses[size],
            size === 'lg' && 'rounded-2xl text-white placeholder-slate-500 shadow-glow-lg border-slate-600/60',
            'focus:ring-2 focus:ring-primary-500'
          )}
          aria-label="Search books"
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className={clsx(
              'absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors',
              size === 'lg' ? 'right-16' : 'right-10'
            )}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className={clsx(
            'absolute right-2 top-1/2 -translate-y-1/2',
            size === 'lg'
              ? 'btn-primary btn-md !py-2 !px-4 rounded-xl'
              : 'btn-ghost btn-sm !px-2'
          )}
          aria-label="Submit search"
        >
          {size === 'lg' ? 'Search' : <Search size={14} />}
        </button>
      </div>
    </form>
  );
}
