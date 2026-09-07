import type { User } from '@/types';

export interface AuthUser extends User {
  roleName?: string;
  reviewEligible?: boolean;
  trialEligible?: boolean;
  phoneBound: boolean;
  phoneMasked: string;
  passwordInitialized: boolean;
  usernameInitialized: boolean;
}
