P

---

# 🧠 AI Boss Guidelines & Rules

## 1. Code Quality & Standards

* Code must be **clean, readable, and modular**
* Follow naming conventions strictly:

  * camelCase → variables, functions
  * PascalCase → components, classes
* Avoid hardcoding values — use environment variables
* Follow **DRY (Don’t Repeat Yourself)** principle
* Write reusable components and functions
* Maintain proper folder structure:

  ```
  /controllers
  /routes
  /models
  /services
  /utils
  ```
* Use ES6+ modern JavaScript
* Add meaningful comments only where required
* All APIs must follow REST standards
* Use versioning:

  ```
  /api/v1/
  ```

---

## 2. Project Flow & Architecture

* Follow **3-tier architecture**:

  ```
  Frontend → Backend → Database
  ```

### Mandatory Modules:

1. **Authentication System**

   * JWT-based authentication
   * Secure login/signup
   * Role-based access (if needed)

2. **User Management**

   * Store:

     * Unique ID
     * Profile image (URL only)
     * Phone number
     * Address + Geo location
   * Profile update system

3. **Payment System**

   * Secure payment gateway integration
   * Transaction verification
   * Payment history tracking

4. **Notification System**

   * Real-time notifications
   * Event-triggered alerts
   * Push notifications support

5. **Polling / Decision Engine**

   * Create polls
   * Vote system
   * Result calculation logic

6. **Personalization Engine**

   * Data-based recommendations
   * Location-based logic

---


---

## 3. Communication Style

* AI must respond:

  * Clearly and directly
  * No unnecessary theory
  * Focus on practical implementation
* Always break complex tasks into steps
* Prefer real-world examples over abstract explanations
* If something is unclear → ask questions instead of guessing
* Provide optimized solutions, not basic ones

---

## 4. Error Handling & Stability

* Every API must include:

  * try-catch blocks
  * proper error responses
* Standard error format:

```json id="err1"
{
  "success": false,
  "message": "Error description"
}
```

* Validate all inputs:

  * Required fields
  * Data types
  * Format (email, phone, etc.)

* Handle edge cases:

  * Missing data
  * Invalid tokens
  * Payment failures
  * Network issues

* Logging:

  * Log all errors (server + database)

* Security:

  * Use HTTPS only
  * Encrypt sensitive data
  * Never expose secrets

---

## 🔐 5. Security Protocol (Strict)

* JWT authentication required
* Use Authorization headers:

  ```
  Bearer TOKEN
  ```
* Rate limiting on APIs
* Prevent SQL/NoSQL injection
* Use environment variables for:

  * API keys
  * Database URI

---

## 🚀 6. Performance & Scalability

* Use pagination for large data
* Optimize database queries
* Use caching if needed (Redis optional)
* Keep APIs fast (<300ms response target)
* Lazy load frontend components

---

## 📦 7. Deployment Rules

* Backend → Cloud (AWS / Render)
* Database → Cloud (MongoDB Atlas)
* Storage → Firebase Storage
* Use CI/CD if possible
* Maintain separate environments:

  * dev
  * production

---

## 🧪 8. Testing Rules

* Test all APIs using Postman
* Validate:

  * Success cases
  * Failure cases
* No feature goes live without testing

---

# 🔥 FINAL RULE (VERY IMPORTANT)

* Build like a **real product, not a college project**
* Focus on:

  * Scalability
  * Security
  * Clean architecture
* Every feature must have a **clear purpose**

---
