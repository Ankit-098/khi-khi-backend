# Backend Development Guidelines

Stack: **Node.js + Express + MongoDB (Mongoose)**

AI agents must follow these standards when generating or modifying backend code.

---

# 1. Project Structure

Maintain a clean modular structure.

```
src/
  config/
  controllers/
  services/
  models/
  routes/
  middleware/
  validators/
  utils/
  constants/
  jobs/
  scripts/
```

### Responsibilities

**routes**

* Only define API routes

**controllers**

* Handle request & response
* No business logic

**services**

* Business logic
* DB operations

**models**

* Mongoose schemas only

**middleware**

* auth
* validation
* logging
* rate limit

**utils**

* reusable helpers

---

# 2. API Versioning

All APIs must be versioned.

Example:

```
/api/v1/auth/login
/api/v1/users
/api/v2/users
```

Routes structure:

```
routes/
   v1/
      auth.routes.js
      user.routes.js
```

Rules:

* Never break existing API contracts
* New changes go to **new version**

---

# 3. Controller Rules

Controllers must remain thin.

Bad

```
controller -> DB query -> logic -> response
```

Good

```
controller -> service -> response
```

Example

```
controller
   userService.createUser()
```

---

# 4. Mongoose Model Guidelines

Schema rules:

* Use **timestamps**
* Add **indexes**
* Use **schema validation**

Example:

```
timestamps: true
index: true
required: true
```

Avoid:

* business logic inside schema
* heavy pre/post hooks unless necessary

---

# 5. API Response Standard

All responses must follow a consistent format.

Success

```
{
  success: true,
  data: {},
  message: ""
}
```

Error

```
{
  success: false,
  error: "ERROR_CODE",
  message: ""
}
```

---

# 6. Security Guidelines

AI must check for security vulnerabilities.

### Must Implement

* Helmet
* Rate limiting
* Input validation
* Sanitization

Libraries preferred:

```
helmet
express-rate-limit
joi/zod
mongo-sanitize
```

### Authentication

* JWT tokens
* secure httpOnly cookies (if web)
* token expiry handling

### Never Expose

* secrets
* private keys
* database credentials

Use:

```
.env
```

---

# 7. Database Best Practices

### Rules

* Always use indexes for frequently queried fields
* Avoid full collection scans
* Use projection to limit fields

Example

```
User.find({}, "name email")
```

### Avoid

```
User.find()
```

on large collections.

---

# 8. Query Optimization

AI must optimize Mongo queries.

Prefer:

```
lean()
```

Example

```
User.find().lean()
```

Benefits:

* faster queries
* less memory usage

---

# 9. Logging & Traceability

Every request must be traced and logged for performance and debugging.

### Global Request Logger
* **Trace ID**: A unique `randomUUID()` must be generated for every request.
* **Execution Time**: Track precise execution time using `process.hrtime()`.
* **Headers**: Return `X-Trace-ID` in the response headers.
* **Middleware**: Use `loggerMiddleware` globally in `index.ts`.

### Logging Rules
* Use structured logging format.
* **Never log**: passwords, tokens, or personal sensitive data.
* Preferred: `pino` or `winston` for production. Currently using standard `console.log` with structured prefixes for convenience.

---

# 10. Error Handling

Centralized error handler required.

Structure

```
middleware/errorHandler.js
```

Never send raw stack traces in production.

---

# 11. API Performance

AI must ensure:

* minimal DB queries
* no nested loops on DB results
* pagination for list APIs

Example

```
?page=1&limit=20
```

---

# 12. Code Quality

AI must check:

* no duplicate services
* no repeated queries
* no business logic in routes
* clean naming

Example naming:

```
user.service.js
auth.controller.js
```

---

# 13. Backend Review Checklist

Before finalizing backend code AI must verify:

✔ API versioning followed
✔ Controllers are thin
✔ Services handle business logic
✔ Queries optimized
✔ lean() used where possible
✔ Security middleware implemented
✔ No sensitive data exposure
✔ Response structure consistent
✔ Pagination implemented
✔ Proper error handling
✔ Global logging & Trace ID implementation verified

---

# 14. Development Philosophy

Backend must prioritize:

* security
* performance
* maintainability
* scalability

AI agents must behave like a **senior backend architect reviewing production code**.
