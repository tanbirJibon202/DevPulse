import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../../db";
import config from "../../config/env";
import type {
  ILoginPayload,
  ISignupPayload,
  IUserResponse,
} from "./auth.interface";

const signupUserIntoDB = async (
  payload: ISignupPayload,
): Promise<IUserResponse> => {
  const { name, email, password, role } = payload;

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, role)
    VALUES($1, $2, $3, COALESCE($4, 'contributor'))
    RETURNING id, name, email, role, created_at, updated_at
    `,
    [name, email, hashedPassword, role],
  );

  return result.rows[0];
};

const loginUserIntoDB = async (payload: ILoginPayload) => {
  const { email, password } = payload;

  const result = await pool.query(
    `
    SELECT id, name, email, password, role, created_at, updated_at
    FROM users
    WHERE email = $1
    `,
    [email],
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = result.rows[0];

  const isPasswordMatched = await bcrypt.compare(password, user.password);

  if (!isPasswordMatched) {
    throw new Error("Invalid credentials");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
  };

  const token = jwt.sign(jwtPayload, config.secret as string, {
    expiresIn: "1d",
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };
};

export const authService = {
  signupUserIntoDB,
  loginUserIntoDB,
};
