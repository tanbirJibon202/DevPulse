export const USER_ROLE = {
  contributor: "contributor",
  maintainer: "maintainer",
} as const;

export type ROLES = (typeof USER_ROLE)[keyof typeof USER_ROLE];

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        name: string;
        email?: string;
        role: "contributor" | "maintainer";
      };
    }
  }
}