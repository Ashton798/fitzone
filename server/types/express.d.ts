declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      userId: string;
      phone?: string;
      email?: string;
    };
  }
}

export {};
