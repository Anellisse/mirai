import { Role } from '../enums/roles';

export interface UserPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
  twoFactorVerified: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organizationId: string;
}
