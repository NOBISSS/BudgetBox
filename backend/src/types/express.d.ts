declare global {
  namespace Express {
    interface Request {
      user?: { id: string; jti: string; issuedAt: number; expiresAt: number };
    }
  }
}

export {};
