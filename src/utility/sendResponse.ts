import type { Response } from "express";

type TResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
};

const sendResponse = <T>(res: Response, data: TResponse<T>) => {
  const responseData: {
    success: boolean;
    message: string;
    data?: T;
    error?: unknown;
  } = {
    success: data.success,
    message: data.message,
  };

  if (data.data !== undefined) {
    responseData.data = data.data;
  }

  if (data.error !== undefined) {
    responseData.error = data.error;
  }

  res.status(data.statusCode).json(responseData);
};

export default sendResponse;
