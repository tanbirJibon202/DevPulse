

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/config/env.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  secret: process.env.JWT_SECRET,
  refresh_secret: process.env.JWT_REFRESH_SECRET
};
var env_default = config;

// src/db/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: env_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues(
      id SERIAL PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      description TEXT NOT NULL CHECK (LENGTH(description) >= 20),
      type VARCHAR(50) NOT NULL CHECK (type IN ('bug', 'feature_request')),
      status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
      reporter_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
      )
      `);
    console.log("Database connected successfully!");
  } catch (error) {
    console.log(error);
  }
};

// src/app.ts
import express from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
var signupUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, role)
    VALUES($1, $2, $3, COALESCE($4, 'contributor'))
    RETURNING id, name, email, role, created_at, updated_at
    `,
    [name, email, hashedPassword, role]
  );
  return result.rows[0];
};
var loginUserIntoDB = async (payload) => {
  const { email, password } = payload;
  const result = await pool.query(
    `
    SELECT id, name, email, password, role, created_at, updated_at
    FROM users
    WHERE email = $1
    `,
    [email]
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
    role: user.role
  };
  const token = jwt.sign(jwtPayload, env_default.secret, {
    expiresIn: "1d"
  });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at
    }
  };
};
var authService = {
  signupUserIntoDB,
  loginUserIntoDB
};

// src/utility/sendResponse.ts
var sendResponse = (res, data) => {
  const responseData = {
    success: data.success,
    message: data.message
  };
  if (data.data !== void 0) {
    responseData.data = data.data;
  }
  if (data.error !== void 0) {
    responseData.error = data.error;
  }
  res.status(data.statusCode).json(responseData);
};
var sendResponse_default = sendResponse;

// src/modules/auth/auth.controller.ts
var signupUser = async (req, res) => {
  try {
    const result = await authService.signupUserIntoDB(req.body);
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "User registered successfully",
      data: result
    });
  } catch (error) {
    const err = error;
    if (err?.code === "23505") {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error"
    });
  }
};
var loginUser = async (req, res) => {
  try {
    const result = await authService.loginUserIntoDB(req.body);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    const err = error;
    if (err?.message === "Invalid credentials") {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }
    res.status(500).json({
      success: false,
      message: err?.message || "Internal Server Error"
    });
  }
};
var authController = {
  signupUser,
  loginUser
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signupUser);
router.post("/login", authController.loginUser);
var authRoute = router;

// src/modules/issue/issue.route.ts
import { Router as Router2 } from "express";

// src/modules/issue/issue.service.ts
var createIssueIntoDB = async (payload, reporterId) => {
  const { title, description, type } = payload;
  const result = await pool.query(
    `
    INSERT INTO issues(title, description, type, reporter_id)
    VALUES($1, $2, $3, $4)
    RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `,
    [title, description, type, reporterId]
  );
  return result.rows[0];
};
var getAllIssuesFromDB = async (query) => {
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
  const conditions = [];
  const values = [];
  if (type) {
    values.push(type);
    conditions.push(`type = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`status = $${values.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderBy = sort === "oldest" ? "ASC" : "DESC";
  const issuesResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    ${whereClause}
    ORDER BY created_at ${orderBy}
    `,
    values
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
        [issue.reporter_id]
      );
      return {
        id: issue.id,
        title: issue.title,
        description: issue.description,
        type: issue.type,
        status: issue.status,
        reporter: reporterResult.rows[0],
        created_at: issue.created_at,
        updated_at: issue.updated_at
      };
    })
  );
  return issuesWithReporter;
};
var getSingleIssueFromDB = async (id) => {
  const issueResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    WHERE id = $1
    `,
    [id]
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
    [issue.reporter_id]
  );
  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: reporterResult.rows[0],
    created_at: issue.created_at,
    updated_at: issue.updated_at
  };
};
var updateIssueIntoDB = async (id, payload, userId, userRole) => {
  const { title, description, type, status } = payload;
  const issueResult = await pool.query(
    `
    SELECT id, title, description, type, status, reporter_id, created_at, updated_at
    FROM issues
    WHERE id = $1
    `,
    [id]
  );
  if (issueResult.rows.length === 0) {
    return {
      statusCode: 404,
      success: false,
      message: "Issue not found",
      data: null
    };
  }
  const issue = issueResult.rows[0];
  if (userRole === "contributor") {
    if (issue.reporter_id !== userId) {
      return {
        statusCode: 403,
        success: false,
        message: "Forbidden! You can update only your own issue",
        data: null
      };
    }
    if (issue.status !== "open") {
      return {
        statusCode: 409,
        success: false,
        message: "You can update only open issues",
        data: null
      };
    }
    if (status) {
      return {
        statusCode: 403,
        success: false,
        message: "Forbidden! Contributors cannot update issue status",
        data: null
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
    [title, description, type, status, id]
  );
  return {
    statusCode: 200,
    success: true,
    message: "Issue updated successfully",
    data: updatedResult.rows[0]
  };
};
var deleteIssueFromDB = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM issues
    WHERE id = $1
    RETURNING id, title, description, type, status, reporter_id, created_at, updated_at
    `,
    [id]
  );
  return result;
};
var issueService = {
  createIssueIntoDB,
  getAllIssuesFromDB,
  getSingleIssueFromDB,
  updateIssueIntoDB,
  deleteIssueFromDB
};

// src/modules/issue/issue.controller.ts
var createIssue = async (req, res) => {
  try {
    const reporterId = req.user?.id;
    if (!reporterId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const result = await issueService.createIssueIntoDB(
      req.body,
      Number(reporterId)
    );
    sendResponse_default(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result
    });
  } catch (error) {
    const err = error;
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const result = await issueService.getAllIssuesFromDB(req.query);
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issues retrieved successfully",
      data: result
    });
  } catch (error) {
    const err = error;
    if (err.message?.startsWith("Invalid")) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};
var getSingleIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.getSingleIssueFromDB(id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Issue not found"
      });
    }
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue retrieved successfully",
      data: result
    });
  } catch (error) {
    const err = error;
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};
var updateIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const result = await issueService.updateIssueIntoDB(
      id,
      req.body,
      Number(userId),
      String(userRole)
    );
    if (!result.success) {
      return res.status(result.statusCode).json({
        success: result.success,
        message: result.message
      });
    }
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    const err = error;
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};
var deleteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.deleteIssueFromDB(id);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Issue not found"
      });
    }
    sendResponse_default(res, {
      statusCode: 200,
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    const err = error;
    res.status(500).json({
      success: false,
      message: err.message || "Internal Server Error"
    });
  }
};
var issueController = {
  createIssue,
  getAllIssues,
  getSingleIssue,
  updateIssue,
  deleteIssue
};

// src/middleware/auth.ts
import "express";
import jwt2 from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }
      const token = authHeader;
      const decoded = jwt2.verify(token, env_default.secret);
      const userData = await pool.query(
        `
        SELECT id, name, email, role
        FROM users
        WHERE id = $1
        `,
        [decoded.id]
      );
      if (userData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      const user = userData.rows[0];
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden"
        });
      }
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
  };
};
var auth_default = auth;

// src/types/index.ts
var USER_ROLE = {
  contributor: "contributor",
  maintainer: "maintainer"
};

// src/modules/issue/issue.route.ts
var router2 = Router2();
router2.post(
  "/",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issueController.createIssue
);
router2.get("/", issueController.getAllIssues);
router2.get("/:id", issueController.getSingleIssue);
router2.patch(
  "/:id",
  auth_default(USER_ROLE.contributor, USER_ROLE.maintainer),
  issueController.updateIssue
);
router2.delete(
  "/:id",
  auth_default(USER_ROLE.maintainer),
  issueController.deleteIssue
);
var issueRoute = router2;

// src/app.ts
import CookieParser from "cookie-parser";
import cors from "cors";

// src/middleware/globalErrorHandler.ts
var globalErrorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    errors: err
  });
};
var globalErrorHandler_default = globalErrorHandler;

// src/app.ts
var app = express();
app.use(CookieParser());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Express Server",
    author: "DevPulse"
  });
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issueRoute);
app.use(globalErrorHandler_default);
var app_default = app;

// src/server.ts
var main = async () => {
  await initDB();
  app_default.listen(env_default.port, () => {
    console.log(`Example app listening on port ${env_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map