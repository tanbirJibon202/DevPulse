import type { Request, Response } from "express";
import { authService } from "./auth.service";
import sendResponse from "../../utility/sendResponse";

const signupUser = async (req: Request, res: Response) => {
  try {
    const result = await authService.signupUserIntoDB(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err?.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error",
    });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const result = await authService.loginUserIntoDB(req.body);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };

    if (err?.message === "Invalid credentials") {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }
    
    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error",
    });
  }
};

export const authController = {
  signupUser,
  loginUser,
};