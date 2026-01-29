/**
 * Secure Password Modal Component
 * 
 * SECURITY: This component provides a secure way to collect passwords
 * without using window.prompt() which is vulnerable to interception.
 * 
 * Features:
 * - Password masking
 * - Secure input handling
 * - Error display
 * - Keyboard navigation
 * - Auto-focus
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FiEye, FiEyeOff } from 'react-icons/fi';

interface SecurePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string) => void | Promise<void>;
  title?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
}

export default function SecurePasswordModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Enter Password',
  description = 'Enter your TIWI wallet password to continue.',
  error,
  isLoading = false,
}: SecurePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Clear password when modal closes
  useEffect(() => {
    if (!open) {
      setPassword('');
      setShowPassword(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!password.trim()) {
      return;
    }
    await onConfirm(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && password.trim() && !isLoading) {
      handleConfirm();
    }
    if (e.key === 'Escape') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[450px] w-full overflow-hidden"
      >
        <div className="flex flex-col gap-6 px-6 py-6">
          <DialogTitle className="font-bold text-2xl text-white">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[#b5b5b5]">
            {description}
          </DialogDescription>
          
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter password"
                disabled={isLoading}
                className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-3 pr-12 text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128] disabled:opacity-50 disabled:cursor-not-allowed"
                autoComplete="current-password"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E7873] hover:text-[#b5b5b5] transition-colors disabled:opacity-50"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 bg-[#121712] border border-[#1f261e] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#1a1f1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!password.trim() || isLoading}
              className="flex-1 bg-[#B1F128] text-[#010501] font-semibold py-3 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#010501] border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm'
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
