export interface IAuthResponse {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  expiresAt: Date;
}
