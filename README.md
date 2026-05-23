# DevPulse – Internal Tech Issue & Feature Tracker

DevPulse is a backend REST API for software teams to report bugs, suggest feature requests, and manage issue resolution workflows. The system supports role-based access control with two user roles: `contributor` and `maintainer`.

## Live URL

https://devpulse-black-one.vercel.app

## Features

- User registration and login
- JWT-based authentication
- Role-based authorization
- Contributor and maintainer roles
- Create new issues as bug reports or feature requests
- View all issues with sorting and filtering
- View single issue details
- Update issues based on role permission
- Delete issues as maintainer only
- PostgreSQL database integration
- Secure password hashing using bcrypt
- Modular Express architecture
- Raw SQL queries using native `pg` driver

## Tech Stack

- Node.js
- TypeScript
- Express.js
- PostgreSQL
- NeonDB
- pg
- bcrypt
- jsonwebtoken
- dotenv
- cors
- cookie-parser
- Vercel

## Project Structure

```txt
src/
├── app.ts
├── server.ts
├── config/
│   └── env.ts
├── db/
│   └── index.ts
├── middleware/
│   ├── auth.ts
│   └── globalErrorHandler.ts
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.interface.ts
│   │   ├── auth.route.ts
│   │   └── auth.service.ts
│   └── issue/
│       ├── issue.controller.ts
│       ├── issue.interface.ts
│       ├── issue.route.ts
│       └── issue.service.ts
├── types/
│   └── index.ts
└── utility/
    └── sendResponse.ts