import { pool } from "../../db";
import type {
  ICreateIssuePayload,
  IGetIssuesQuery,
  IUpdateIssuePayload,
} from "./issue.interface";
const createIssueIntoDB = async (
  payload: ICreateIssuePayload,
  reporterId: number,
) => {
  const { title, description, type } = payload;

  const result = await pool.query(
    `
    INSERT INTO issues(title, description, type, reporter_id)
    VALUES($1, $2, $3, $4)
    RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `,
    [title, description, type, reporterId],
  );

  return result.rows[0];
};

const getAllIssuesFromDB = async (query: IGetIssuesQuery) => {
  const { sort = "newest", type, status } = query;

  const allowedSort = ["newest", "oldest"];
  const allowedType = ["bug", "feature_request"];
  const allowedStatus = ["open", "in_progress", "resolved"];

  if (sort && !allowedSort.includes(sort)) {
    throw new Error("Invalid sort query value");
  }

  if (type && !allowedType.includes(type)) {
    throw new Error("Invalid type query value");
  }

  if (status && !allowedStatus.includes(status)) {
    throw new Error("Invalid status query value");
  }

  const conditions: string[] = [];
  const values: string[] = [];

  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }

  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const orderBy = sort === "oldest" ? "ASC" : "DESC";

  const issuesResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    ${whereClause}
    ORDER BY created_at ${orderBy}
    `,
    values,
  );

  const issues = issuesResult.rows;

  const issuesWithReporter = await Promise.all(
    issues.map(async (issue) => {
      const reporterResult = await pool.query(
        `
        SELECT id, name, role
        FROM users
        WHERE id = $1
        `,
        [issue.reporter_id],
      );

      return {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        status: issue.status,
        reporter: reporterResult.rows[0],
        created_at: issue.created_at,
        updated_at: issue.updated_at,
      };
    }),
  );

  return issuesWithReporter;
};

const getSingleIssueFromDB = async (id: string) => {
  const issueResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    WHERE id = $1
    `,
    [id],
  );

  if (issueResult.rows.length === 0) {
    return null;
  }

  const issue = issueResult.rows[0];

  const reporterResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = $1
    `,
    [issue.reporter_id],
  );

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporterResult.rows[0],
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
};

const updateIssueIntoDB = async (
  id: string,
  payload: IUpdateIssuePayload,
  userId: number,
  userRole: string,
) => {
  const { title, description, type, status } = payload;
  const issueResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    WHERE id = $1
    `,
    [id],
  );

  if (issueResult.rows.length === 0) {
    return {
      statusCode: 404,
      success: false,
      message: "Issue not found",
      data: null,
    };
  }

  const issue = issueResult.rows[0];

  if (userRole === "contributor") {
    if (issue.reporter_id !== userId) {
      return {
        statusCode: 403,
        success: false,
        message: "Forbidden! You can update only your own issue",
        data: null,
      };
    }

    if (issue.status !== "open") {
      return {
        statusCode: 409,
        success: false,
        message: "You can update only open issues",
        data: null,
      };
    }

    if (status) {
      return {
        statusCode: 403,
        success: false,
        message: "Forbidden! Contributors cannot update issue status",
        data: null,
      };
    }
  }

  const updatedResult = await pool.query(
    `
  UPDATE issues
  SET
    title = COALESCE($1, title),
    description = COALESCE($2, description),
    type = COALESCE($3, type),
    status = COALESCE($4, status),
    updated_at = NOW()
  WHERE id = $5
  RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
  `,
    [title, description, type, status, id],
  );

  return {
    statusCode: 200,
    success: true,
    message: "Issue updated successfully",
    data: updatedResult.rows[0],
  };
};

const deleteIssueFromDB = async (id: string) => {
  const result = await pool.query(
    `
    DELETE FROM issues
    WHERE id = $1
    RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `,
    [id],
  );
  return result;
};

export const issueService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueIntoDB,
  deleteIssueFromDB,
};
