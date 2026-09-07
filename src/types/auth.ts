export type UserRole = 'player' | 'admin';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: string;
  player_id: string; // Unique ID format e.g. BHUK-100001
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  coin_balance: number;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  token: string;
  userId: string;
  player_id: string;
  username: string;
  email: string;
  role: UserRole;
  expiresAt: number;
}
