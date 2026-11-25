# Expense Tracker

A full-stack expense tracker with React, Express, PostgreSQL, and JWT authentication.

## Features

| Module | Features |
| --- | --- |
| Dashboard | Total balance, income, and expenses |
| Transactions | Add, edit, and delete transactions |
| Categories | Food, Travel, Shopping, Education, plus custom categories |
| Analytics | Monthly income/expense charts |
| Authentication | Register, login, logout |

## Project structure

```
expense-tracker/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── styles/
└── backend/
    ├── config/
    ├── controllers/
    ├── routes/
    ├── models/
    └── middleware/
```

## Prerequisites

- Node.js
- PostgreSQL

Create a database named `expense_tracker`.

## Backend setup

```bash
cd backend
copy .env.example .env
```

Update `.env` with your PostgreSQL credentials and a JWT secret:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=expense_tracker
DB_PASSWORD=your_password
DB_PORT=5432
PORT=5000
JWT_SECRET=change_this_secret
```

```bash
npm install
npm run dev
```

The API runs at `http://localhost:5000`. Tables are created automatically on startup.

### API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/transactions`
- `PUT|DELETE /api/transactions/:id`
- `GET|POST /api/categories`
- `DELETE /api/categories/:id`

Protected routes require `Authorization: Bearer <token>`.

## Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

The frontend uses `http://localhost:5000/api` by default. To use another API URL, copy
`.env.example` to `.env` and set `VITE_API_URL`.

Register an account, then use Dashboard, Transactions, Categories, and Analytics.
