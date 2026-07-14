# Walkthrough – Grievix AI

Grievix AI is an enterprise-grade AI-powered grievance management platform designed for citizens and government officials. It features real-time tracking, automated department routing, SLA escalation, workload balancing, and interactive coordinate plotting dashboards.

---

## 1. Project Directory Structure

The project is structured as a multi-module workspace:
- **`backend/`**: A Spring Boot 3.3.4 (Java 17 target) Maven project containing all business logic, security rules, Gemini API integrations, SLA scheduler, and databases.
- **`frontend/`**: A Vite-powered React + Tailwind CSS dashboard containing visual dashboards for Citizens, Officers, and Admins, integrated with Recharts for analytics and custom timelines.
- **`docker-compose.yml`**: A configuration file to orchestrate PostgreSQL, Redis, and Kafka in production.

---

## 2. Production-Ready Enterprise Backend Features

The backend code compiles and targets Java 17 compatibility. Key files updated/created:

1. **JPA Database Model Schema (`com.grievix.model`)**:
   - [User.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/model/User.java): Stores username, password, email, role, and department.
   - [Complaint.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/model/Complaint.java): Holds incident text description, GPS coordinates, category, priority, status, assigned officer, resolution logs, ratings, and SLA timestamps.
   - [ComplaintHistory.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/model/ComplaintHistory.java): Tracks every transition state of the complaint, forming the citizen progress timeline.
   - [EscalationLog.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/model/EscalationLog.java): Audits SLA breaches when deadlines are missed.

2. **Global REST Exception Handler (`com.grievix.exception`)**:
   - [GlobalExceptionHandler.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/exception/GlobalExceptionHandler.java): Catches REST controllers exceptions globally. Instead of raw Tomcat error pages, it formats exceptions into structured JSON bodies:
     - `ResourceNotFoundException`: Thrown on database lookup failures (e.g. invalid case ID) -> returns a clean `404 Not Found` JSON.
     - `BadRequestException`: Thrown on validation errors or prohibited actions (e.g. submitting feedback on open issues) -> returns `400 Bad Request` JSON.
     - `MethodArgumentNotValidException`: Catches input validations (`@Valid`) and maps field errors to clear messages (e.g. `{ "email": "must be a valid email" }`).

3. **OpenAPI / Swagger UI Interactive Playground (`com.grievix.config.OpenApiConfig`)**:
   - [OpenApiConfig.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/config/OpenApiConfig.java): Auto-generates a Swagger interactive UI playground. It integrates a JWT Bearer security scheme so developers can authorize their session tokens and test endpoints directly inside the web browser.
   - Access Swagger UI: `http://localhost:8080/swagger-ui/index.html`

4. **Security & Authentication (`com.grievix.security`)**:
   - [SecurityConfig.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/security/SecurityConfig.java): Configures stateless sessions, CORS mapping (allowing ports `5173` and `5174`), and public paths (Swagger UI, H2 Console, Auth endpoints).
   - [JwtUtils.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/security/JwtUtils.java): Processes access tokens and refresh tokens.
   - [RateLimitFilter.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/security/RateLimitFilter.java): In-memory Token Bucket rate limiter protecting endpoints from abuse.

5. **Gemini AI Service (`com.grievix.service.GeminiService`)**:
   - [GeminiService.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/service/GeminiService.java): Integrates with `gemini-1.5-flash` model utilizing the standard content HTTP API.
   - Prompts the AI to output structured JSON mapping category, urgency (priority), department routing, and semantic duplicate detection checks against other local active grievances in the same area.
   - **Keyword Fallback Engine**: If no Gemini API key is configured, a custom keyword matcher runs locally to classify complaints.

6. **SLA Escalation Engine (`com.grievix.service.EscalationEngine`)**:
   - [EscalationEngine.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/service/EscalationEngine.java): A Spring scheduler that scans for unresolved complaints past their SLA deadlines, changes status to `ESCALATED`, increments priority, records escalation logs, and alerts officers.

7. **Workload-Balanced Assignment Router**:
   - [ComplaintService.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/service/ComplaintService.java): When a complaint is filed, the router queries the active workloads of officers in the target department and assigns the grievance to the officer with the fewest active tasks to balance workloads.

8. **Database Seeder with Expanded Hotspots (`com.grievix.config.DataLoader`)**:
   - [DataLoader.java](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/backend/src/main/java/com/grievix/config/DataLoader.java): Seeds the H2 database on startup with default developer logins and active, resolved, and overdue complaints.
   - **Polished coordinates and local image paths**: Seeds 6 default grievances mapped to local image assets (`/presets/...`) and distributed across 6 different coordinates (JP Nagar, HSR Layout, Shanti Nagar, Indiranagar, Whitefield, Yelahanka) to populate the admin operations map instantly.

---

## 3. Production-Ready Enterprise Frontend Features

The React web application features premium styling, Outfit typography, glassmorphism designs, hover animations, and dark themes.

1. **Central API Instance & Security Token Auto-Injection (`src/api.js`)**:
   - [api.js](file:///C:/Users/Preetham%20Kotagiri/.gemini/antigravity-ide/scratch/grievix-ai/frontend/src/api.js): Creates a centralized Axios instance. It sets the `baseURL`, inserts request interceptors that automatically attach `Authorization: Bearer <token>` on all outgoing requests, and implements a global response interceptor that auto-ejects expired sessions and redirects users back to login on `401 Unauthorized` codes.

2. **Local Image Presets (Offline-Ready)**:
   - High-quality, AI-generated grievance images are placed in the `public/presets/` folder (road damage, garbage container, water leakage, sparking transformer). This replaces external Unsplash URLs, preventing loading errors.

3. **Expanded Locations Database (18 Wards)**:
   - The hotspots selector has been expanded to **18 major zones** covering all zones of Bengaluru (e.g., Koramangala, Jayanagar, Malleshwaram, Rajajinagar, Bellandur, Hebbal, Basavanagudi). Selecting a location automatically pre-fills GPS coordinate fields and ward mappings.

4. **Interactive Operations Blueprint Map (`pages/AdminDashboard.jsx`)**:
   - **Interactive SVG Mapping Engine**: Reads active complaint coordinates from the database and plots them onto a blueprint layout of the city with glowing dots.
   - **Priority/Status Color Mapping**: Dots glow red (Escalated/Critical), orange (High), blue (Medium/Low), or green (Resolved).
   - **Active Information Overlay Drawer**: Clicking on any plotted coordinate dot displays a floating slide-up details modal highlighting case ID, title, description, ward area, priority, and assigned officer.
   - **Map Legend Panel**: Explains classifications and bounding coordinate scales.

5. **Authentication Portal (`pages/Login.jsx`)**:
   - Standard login/register form with a built-in **Quick Demo Logins** drawer supporting one-click sign-in to test different roles.

---

## 4. Local Execution Guide

To run and view the application locally, follow these steps:

### A. Run the Backend (Spring Boot)
1. Set the Gemini API key in your terminal/environment (optional; if empty, smart fallbacks will be used):
   ```cmd
   set GEMINI_API_KEY=your_gemini_api_key_here
   ```
2. Navigate to the backend directory and launch the application:
   ```cmd
   mvn spring-boot:run
   ```
3. The server will launch on `http://localhost:8080`.
4. Open the H2 database console: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:grievixdb`, Username: `sa`, Password: empty).
5. Open the Swagger UI interactive specification: `http://localhost:8080/swagger-ui/index.html`

### B. Run the Frontend (React Vite)
1. Navigate to the frontend directory:
   ```cmd
   cd frontend
   ```
2. Launch the Vite development server:
   ```cmd
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`.
4. Use the **Quick Developer Logins** panel on the login screen to sign in as any role instantly!
