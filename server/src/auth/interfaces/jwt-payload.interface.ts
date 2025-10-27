export interface JwtPayload {
  sub: string; // User ID (UUID from Prisma)
  email: string;
}
