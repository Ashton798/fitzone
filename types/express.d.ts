// 扩展 Express Request 类型,添加 user 字段(JWT 认证后挂载)
declare module 'express' {
  interface Request {
    user?: {
      userId: string;
      phone?: string;
    };
  }
}

export {};
