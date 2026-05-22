export interface ISignupPayload {
  name: string;
  email: string;
  password: string;
  role?: "contributor" | "maintainer";
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IUserResponse {
  id: number;
  name: string;
  email: string;
  role: "contributor" | "maintainer";
  created_at: Date;
  updated_at: Date;
}
