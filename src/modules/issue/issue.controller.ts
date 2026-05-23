import type { Request, Response } from "express";
import { issueService } from "./issue.service";
import sendResponse from "../../utility/sendResponse";
const createIssue = async (req: Request, res: Response) => {
  try {
    const reporterId = req.user?.id;

    if (!reporterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await issueService.createIssueIntoDB(
      req.body,
      Number(reporterId),
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

const getAllIssues = async (req: Request, res: Response) => {
  try {
    const result = await issueService.getAllIssuesFromDB(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrieved successfully",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };

    if (err.message?.startsWith("Invalid")) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

const getSingleIssue = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const result = await issueService.getSingleIssueFromDB(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issue retrieved successfully",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
const updateIssue = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await issueService.updateIssueIntoDB(
      id,
      req.body,
      Number(userId),
      String(userRole),
    );

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message,
      });
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};
const deleteIssue = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;

  try {
    const result = await issueService.deleteIssueFromDB(id);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Issue not found",
      });
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error",
    });
  }
};

export const issueController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue,
};
