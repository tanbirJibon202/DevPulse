import { type NextFunction, type Request, type Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/env";
import { pool } from "../db";
import type { ROLES } from "../types";

const auth = (...roles: ROLES[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
      const token = authHeader;

      const decoded = jwt.verify(token, config.secret as string) as JwtPayload;

      const userData = await pool.query(
        `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
        `,
        [decoded.id],
      );

      if (userData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userData.rows[0];

      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
  };
};

export default auth;
