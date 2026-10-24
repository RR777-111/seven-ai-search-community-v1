import { EnterSearchButton } from '@/components/navigation/EnterSearchButton';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

interface NeoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
}

export function NeoButton({ children, className = '', disabled, loading = false, type = 'button', ...props }: NeoButtonProps) {
  return <button {...props} className={`neo-button ${className}`.trim()} disabled={disabled || loading} type={type}>{loading ? '处理中...' : children}</button>;
}

interface NeoInputProps extends InputHTMLAttributes<HTMLInputElement> { error?: boolean }

export function NeoInput({ className = '', error = false, ...props }: NeoInputProps) {
  return <input {...props} className={`neo-input ${error ? 'neo-input-error' : ''} ${className}`.trim()} />;
}

export function NeoSearchButton({ children, className = '', disabled, loading = false, ...props }: NeoButtonProps) {
  return <NeoButton {...props} aria-busy={loading || undefined} aria-label={props['aria-label'] ?? '搜索'} className={`neo-search-button ${className}`.trim()} disabled={disabled} loading={false}>{children}</NeoButton>;
}

export function NeoBrand({ className = '' }: { className?: string }) {
  return <div aria-label="Seven AI Search" className={`neo-brand ${className}`.trim()}><EnterSearchButton /></div>;
}
