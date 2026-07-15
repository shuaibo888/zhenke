import type { User } from '@/types';

export interface AuthUser extends User {
  roleName?: string;
  reviewEligible?: boolean;
  trialEligible?: boolean;
}

export function passwordHasLetterAndNumber(password: string) {
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isValidUsername(username: string) {
  return /^[A-Za-z0-9_]{4,20}$/.test(username.trim());
}

export function isValidPassword(password: string) {
  return password.length >= 6 && password.length <= 20 && passwordHasLetterAndNumber(password);
}
