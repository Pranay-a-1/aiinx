# AI-Assisted Coding Workflow — Standard Operating Procedure (SOP)

**Purpose:** A daily-use, step-by-step reference for picking up any JIRA ticket in a large Java + Spring Boot + Gradle enterprise codebase. Follow these phases sequentially to gather full context before engaging GitHub Copilot or any AI coding assistant, ensuring accurate, convention-compliant, production-ready output on the first attempt.

**Stack:** Java 17+ · Spring Boot 3.x · Gradle (multi-module) · JPA/Hibernate · JAXB/XML · REST APIs

---

## Table of Contents

- [Phase 0 — Environment & Tooling Readiness](#phase-0--environment--tooling-readiness)
- [Phase 1 — Understand the JIRA Ticket](#phase-1--understand-the-jira-ticket)
- [Phase 2 — Codebase Exploration (Large Codebase Navigation)](#phase-2--codebase-exploration-large-codebase-navigation)
- [Phase 3 — Convention Discovery Checklist](#phase-3--convention-discovery-checklist)
- [Phase 4 — Context Gathering Checklist (Pre-AI)](#phase-4--context-gathering-checklist-pre-ai)
- [Phase 5 — Ticket-Type Specific Preparation](#phase-5--ticket-type-specific-preparation)
- [Phase 6 — Migration Ticket Preparation (Special Phase)](#phase-6--migration-ticket-preparation-special-phase)
- [Phase 7 — Crafting the AI Prompt (GitHub Copilot Focus)](#phase-7--crafting-the-ai-prompt-github-copilot-focus)
- [Phase 8 — Post-AI Output Validation Checklist](#phase-8--post-ai-output-validation-checklist)
- [Phase 9 — Debugging & API Testing SOP](#phase-9--debugging--api-testing-sop)
- [Phase 10 — Git Workflow & PR Submission Checklist](#phase-10--git-workflow--pr-submission-checklist)
- [Phase 11 — Knowledge Capture & Growth Loop](#phase-11--knowledge-capture--growth-loop)
- [Appendix A — Worked Example: New Endpoint (Ticket A)](#appendix-a--worked-example-new-endpoint-ticket-a)
- [Appendix B — Worked Example: Migration (Ticket B)](#appendix-b--worked-example-migration-ticket-b)
- [Appendix C — Daily Quick-Reference Cheat Sheet](#appendix-c--daily-quick-reference-cheat-sheet)
- [Appendix D — Anti-Patterns: What Never to Do with AI Coding Tools](#appendix-d--anti-patterns-what-never-to-do-with-ai-coding-tools)
- [Appendix E — Spring Boot Stack Trace Reading Guide](#appendix-e--spring-boot-stack-trace-reading-guide)

---

## Phase 0 — Environment & Tooling Readiness

**Purpose:** Verify your development environment is fully operational before starting any ticket work. A broken build, disconnected DB, or misconfigured tool wastes hours.

1. **Pull latest code and verify build**
   - `git pull origin develop` (or your team's main branch)
   - `./gradlew clean build -x test` — confirm the project compiles without errors
   - If multi-module: check which modules are affected by recent changes (`git log --oneline -20`)

2. **Verify local services are running**
   - Database (Oracle/PostgreSQL/MySQL) — confirm connection from your DB client (DBeaver, DataGrip, SQL Developer)
   - Any dependent microservices your service calls — check if stubs/mocks or actual instances are available
   - Redis/Kafka/RabbitMQ if your service uses them — verify they are up locally or via Docker

3. **IDE readiness (IntelliJ IDEA recommended)**
   - Gradle sync is green (no unresolved dependencies)
   - GitHub Copilot plugin is active and authenticated
   - Confirm code indexing is complete (bottom-right progress bar in IntelliJ)
   - Set up key shortcuts you will use repeatedly:
     - `Ctrl+Shift+F` — Find in Files (global text search)
     - `Ctrl+N` — Find Class by name
     - `Ctrl+Shift+N` — Find File by name
     - `Ctrl+Alt+H` — Call Hierarchy (who calls this method?)
     - `Ctrl+H` — Type Hierarchy (class inheritance tree)
     - `Ctrl+B` — Go to Definition
     - `Alt+F7` — Find Usages
     - `Ctrl+Shift+A` — Find Action (search any IDE feature)

4. **API testing tools ready**
   - Postman — relevant collections imported, environment variables set (base URL, auth tokens, API keys)
   - If no Postman collection exists, note this — you will create one during Phase 9
   - Browser DevTools — verify you can hit any local endpoint from the browser if the service has a UI

5. **Access verification**
   - JIRA board accessible and ticket visible
   - Git repository access — can push to feature branches
   - Confluence/wiki — search for any existing documentation for the service you are working on
   - Third-party API documentation — if the ticket involves external integrations, confirm you have access to their docs/sandbox

---

## Phase 1 — Understand the JIRA Ticket

**Purpose:** Fully decode what is being asked before touching any code. Misunderstanding the ticket is the single biggest time-waster.

1. **Identify the ticket type** — classify it as one of:
   - **New Feature / New Endpoint** — building something that does not exist yet
   - **Bug Fix** — something existing is broken
   - **Refactor** — restructure code without changing external behaviour
   - **Performance** — optimize speed, memory, or query performance
   - **Migration** — move codebase/dependencies to a new framework or version
   - **Tech Debt / Cleanup** — remove dead code, upgrade libraries, fix warnings

2. **Read the full ticket description — twice**
   - First read: understand the overall intent ("what does the business want?")
   - Second read: extract every technical detail and constraint

3. **Extract and list Acceptance Criteria (AC)**
   - If the ticket has explicit AC, copy them into your notes
   - If no AC exists, write your own understanding of "done" and confirm with the team before starting
   - **Spring Boot callout:** For endpoint tickets, AC should specify: HTTP method, URL path, request body structure, response structure, HTTP status codes for success and error cases

4. **Identify edge cases and error scenarios**
   - What happens if the input is null/empty/malformed?
   - What happens if a downstream service is unavailable?
   - What happens if the database query returns no results?
   - Are there any rate limiting, timeout, or retry requirements?

5. **Flag ambiguities immediately**
   - List every unclear point
   - Post a comment on the JIRA ticket or message the team on Slack/Teams BEFORE starting
   - Do not assume — clarifying a 2-minute question saves hours of rework
   - Common ambiguities in Spring Boot projects: "Which Spring profile should this run under?", "Is this a new module or an existing module?", "Should this be async?", "What authentication is required?"

6. **Note referenced systems and dependencies**
   - Third-party APIs mentioned (name, version, protocol — REST/SOAP/XML)
   - Internal microservices this ticket interacts with
   - Compliance requirements (PCI-DSS, GDPR, SOX — common in corporate cards domain)
   - Any specific library versions mentioned (e.g., "use MapStruct 1.5+", "migrate to Spring Boot 3.2")

7. **Check linked tickets and epics**
   - Read the parent epic for broader context
   - Check related/blocked tickets — someone else's work may affect yours
   - Look at recently closed tickets in the same area — they may show the pattern to follow

---

## Phase 2 — Codebase Exploration (Large Codebase Navigation)

**Purpose:** Navigate the large, unfamiliar codebase systematically to find where your change belongs and what patterns already exist. In a large enterprise codebase, guessing the structure leads to non-compliant code.

1. **Understand the Gradle multi-module structure**
   - Run: `ls -la` at the project root to see all modules
   - Open `settings.gradle` or `settings.gradle.kts` — this lists every sub-module
   - Identify the module your change belongs to:
     - Module naming often follows a pattern: `service-cards-api`, `service-cards-core`, `service-cards-persistence`, etc.
     - `*-api` or `*-web` modules typically contain Controllers and DTOs
     - `*-core` or `*-service` modules contain business logic
     - `*-persistence` or `*-repository` modules contain JPA entities and repositories
     - `*-client` modules contain Feign clients or RestTemplate wrappers for external calls
   - Check each module's `build.gradle` for its dependencies — this tells you what frameworks/libraries are available in that module

2. **Trace the Controller → Service → Repository chain**
   - **Start from the Controller layer:**
     - Search for existing controllers: `Ctrl+Shift+F` → search for `@RestController` or `@Controller`
     - Find one that handles a similar domain/entity to your ticket
     - Note: the URL path structure (e.g., `/api/v1/cards/{cardId}/transactions`)
   - **Follow into the Service layer:**
     - From the controller method, `Ctrl+B` (Go to Definition) on the injected service
     - Note: Is it an interface + implementation pattern? Are there `@Transactional` annotations?
   - **Follow into the Repository layer:**
     - From the service, `Ctrl+B` on the repository
     - Note: Does it extend `JpaRepository`, `CrudRepository`, or a custom base repository?
     - Check for `@Query` annotations or named queries

3. **Find similar existing implementations (Convention Reference)**
   - This is the most critical step. Even if a direct reference does not exist, find the closest analog:
     - **By domain similarity:** If your ticket is about "card limits", search for an existing "card transactions" or "card accounts" implementation
     - **By technical similarity:** If your ticket requires a third-party XML call, search for `@XmlRootElement`, `Marshaller`, or `RestTemplate` usage patterns
     - **By ticket type:** If this is a new endpoint, find any recently added endpoint (check `git log --diff-filter=A --name-only -- '*.java'` to see recently added files)
   - Open 2-3 similar implementations side by side — you will use these as your convention blueprint

4. **Trace the data flow end-to-end**
   - For an API endpoint, trace: HTTP Request → Controller → Service → Repository → Database → Response DTO → HTTP Response
   - For a message-driven flow, trace: Message Consumer → Service → Repository → Response/Acknowledgement
   - **Use IntelliJ Call Hierarchy** (`Ctrl+Alt+H`) on key methods to see the full call chain
   - **Use IntelliJ Find Usages** (`Alt+F7`) on DTOs and entities to see everywhere they are used

5. **Read existing tests for the affected area**
   - Navigate to `src/test/java` in the relevant module
   - Find tests for the controller/service/repository you identified in step 2
   - Note: What testing framework is used? (JUnit 5, Mockito, SpringBootTest, MockMvc, WireMock, Testcontainers)
   - Note: What is the test naming convention? (`should_returnCard_when_validIdProvided`, `testGetCardById`, `getCard_validId_returnsOk`)
   - Note: Are there integration tests? Where do they live?

6. **Check configuration files**
   - `application.yml` / `application.properties` — environment-specific settings
   - `application-{profile}.yml` — profile-specific configs (dev, staging, prod)
   - Look for: database URLs, third-party API base URLs, feature flags, timeout settings, thread pool configs
   - **Gradle callout:** Check `build.gradle` for custom tasks, code generation plugins (JAXB, OpenAPI, Protobuf), and dependency management BOMs

7. **Identify cross-cutting concerns**
   - Search for `@ControllerAdvice` or `@RestControllerAdvice` — global exception handlers
   - Search for `@Aspect` — AOP aspects for logging, auditing, security
   - Search for `Filter` or `OncePerRequestFilter` — servlet filters for auth, request logging
   - Search for `@Configuration` classes — custom bean definitions, security config, CORS config

---

## Phase 3 — Convention Discovery Checklist

**Purpose:** In a large codebase, conventions are rarely documented — they exist in the code itself. Discover and record them before writing anything, so your code looks like a team member wrote it, not an outsider.

Complete the following checklist by examining 2-3 existing implementations found in Phase 2:

### 3.1 Naming Conventions

| Element | Convention Discovered | Example from Codebase |
|---------|----------------------|----------------------|
| Controller class | e.g., `{Entity}Controller` | `CardAccountController` |
| Service interface | e.g., `{Entity}Service` | `CardAccountService` |
| Service implementation | e.g., `{Entity}ServiceImpl` | `CardAccountServiceImpl` |
| Repository | e.g., `{Entity}Repository` | `CardAccountRepository` |
| Request DTO | e.g., `{Action}{Entity}Request` | `CreateCardAccountRequest` |
| Response DTO | e.g., `{Entity}Response` | `CardAccountResponse` |
| Entity class | e.g., `{Entity}Entity` or just `{Entity}` | `CardAccount` |
| Package structure | e.g., `com.company.cards.{module}.{layer}` | `com.acme.cards.accounts.controller` |
| Method names | e.g., `get/create/update/delete{Entity}` | `getCardById(Long id)` |
| Constants | e.g., `UPPER_SNAKE_CASE` in a constants class | `MAX_RETRY_COUNT` |
| Enum names | e.g., `{Entity}Status`, `{Entity}Type` | `CardStatus.ACTIVE` |

### 3.2 Structural Patterns

- [ ] **Base classes / Abstract layers:** Is there an `AbstractService`, `BaseController`, `BaseEntity` that your code must extend?
- [ ] **Mapper pattern:** Is MapStruct used? Or manual mapping methods? Or a custom mapper interface?
- [ ] **Lombok usage:** Which annotations are standard? (`@Data`, `@Builder`, `@Getter/@Setter`, `@RequiredArgsConstructor`, `@Slf4j`)
- [ ] **Validation approach:** Bean Validation (`@Valid`, `@NotNull`, `@Size`) on DTOs? Or manual validation in the service layer?
- [ ] **Builder pattern:** Lombok `@Builder` or manual builder implementations?

### 3.3 Error Handling & Exception Hierarchy

- [ ] Is there a **custom exception hierarchy**? (e.g., `BusinessException extends RuntimeException`, `NotFoundException extends BusinessException`)
- [ ] What does the **global exception handler** return? (Note the response structure — usually a standard error response DTO)
- [ ] Are **error codes** used? Where are they defined? (enum, constants class, properties file)
- [ ] How are **validation errors** returned? (field-level errors, single message, error list)

### 3.4 REST Response Patterns

- [ ] Is there a **standard response wrapper**? (e.g., `ApiResponse<T>` with `status`, `message`, `data` fields)
- [ ] What **HTTP status codes** are used? (Does the team use `200 OK` for everything with a status field, or proper REST codes `201`, `204`, `404`, `409`?)
- [ ] Are **pagination patterns** standardised? (`Page<T>` from Spring Data, or custom `PaginatedResponse`)
- [ ] Is **HATEOAS** used? (Unlikely in a cards company, but check)

### 3.5 Logging Standards

- [ ] Which **logging framework**? (SLF4J + Logback is standard, but check for custom wrappers)
- [ ] Is `@Slf4j` (Lombok) used, or is `LoggerFactory.getLogger()` explicit?
- [ ] What is **logged at each level**? (INFO for business events, DEBUG for method entry/exit, ERROR for exceptions with stack trace)
- [ ] Is there a **correlation ID / trace ID** pattern? (MDC-based, Spring Cloud Sleuth/Micrometer Tracing)
- [ ] Are **sensitive fields masked** in logs? (PAN, CVV, SSN — critical in corporate cards)

### 3.6 Transaction Management

- [ ] Where is `@Transactional` placed? (Service layer methods? Repository layer? Both?)
- [ ] Is `readOnly = true` used for read operations?
- [ ] Are there **explicit rollback rules**? (`@Transactional(rollbackFor = Exception.class)`)
- [ ] Is there a **distributed transaction** pattern? (Saga, eventual consistency)

### 3.7 Security Patterns

- [ ] How is **authentication** handled? (Spring Security, JWT, OAuth2, API Key header)
- [ ] How is **authorization** done? (`@PreAuthorize`, `@Secured`, method-level security, URL-based security config)
- [ ] Are there **custom security annotations**?
- [ ] How are **API keys / secrets** managed? (Vault, environment variables, encrypted properties)

### 3.8 Testing Patterns

- [ ] **Unit test structure:** Arrange-Act-Assert? Given-When-Then?
- [ ] **Mocking framework:** Mockito (`@Mock`, `@InjectMocks`)? Or Spring's `@MockBean`?
- [ ] **Controller testing:** `@WebMvcTest` with `MockMvc`? Or full `@SpringBootTest`?
- [ ] **Test data setup:** Builders? Fixture files? `@Sql` scripts? Test factories?
- [ ] **Integration test DB:** H2 in-memory? Testcontainers? Shared dev database?

---

## Phase 4 — Context Gathering Checklist (Pre-AI)

**Purpose:** Collect every piece of context you will need before writing a single prompt to GitHub Copilot. The quality of AI output is directly proportional to the quality of context you provide.

Have the following items identified, located, or open in your IDE:

### 4.1 Code Context

- [ ] Relevant **Controller class** (or the closest similar one)
- [ ] Relevant **Service interface and implementation**
- [ ] Relevant **Repository interface**
- [ ] **JPA Entity class** for the database table(s) involved
- [ ] **DTO classes** — Request and Response objects for the endpoint
- [ ] **Mapper class** (MapStruct interface or manual mapper)
- [ ] **Exception classes** used in this area
- [ ] **Global exception handler** (`@ControllerAdvice` class)
- [ ] **Configuration class** if custom beans or properties are needed

### 4.2 Database Context

- [ ] **Table schema** — columns, data types, constraints, indexes (query from DB client or check entity annotations)
- [ ] **Related tables** and foreign key relationships
- [ ] **Existing queries** — any custom `@Query` or native queries in the repository
- [ ] **Flyway/Liquibase migration scripts** if the ticket requires schema changes (check `src/main/resources/db/migration/`)

### 4.3 API Contract Context

- [ ] **Existing API request/response samples** (from Postman, Swagger, or tests)
- [ ] **Swagger/OpenAPI spec** if available (`/swagger-ui.html`, `/v3/api-docs`)
- [ ] **Third-party API documentation** (if integrating with external systems)
- [ ] **WSDL/XSD files** (if SOAP/XML integration is involved)
- [ ] **JAXB model classes** (if XML marshalling/unmarshalling is needed — search for `@XmlRootElement`, `@XmlElement`)

### 4.4 Configuration Context

- [ ] Relevant entries from `application.yml` / `application.properties`
- [ ] **Spring profiles** — which profile does this run under?
- [ ] **Feature flags** — is this feature behind a toggle?
- [ ] **Third-party API keys / URLs** — where are they configured?
- [ ] **Timeout / retry settings** for external calls

### 4.5 Dependency Context

- [ ] Relevant **Gradle dependencies** from `build.gradle` (check the module-specific `build.gradle`, not just the root)
- [ ] **BOM (Bill of Materials)** if dependency versions are managed centrally
- [ ] **Spring Boot version** — check in root `build.gradle` or `gradle.properties` (critical for AI prompts)
- [ ] **Java version** — check `sourceCompatibility` in `build.gradle`

### 4.6 Existing Test Context

- [ ] **Unit tests** for the service/repository being modified
- [ ] **Integration tests** for the controller/endpoint being modified
- [ ] **Test utilities** — shared test builders, test configuration classes
- [ ] **WireMock stubs** for external API calls (if integration tests mock third-party APIs)

---

## Phase 5 — Ticket-Type Specific Preparation

**Purpose:** Each ticket type requires a different preparation approach. Use the section matching your ticket type from Phase 1.

### 5.1 New Feature / New Endpoint

1. **Identify the correct insertion point** in the layer hierarchy:
   - Which module does this endpoint belong to?
   - Which package should the new classes be placed in?
   - Does a Controller already exist for this domain, or do you need a new one?

2. **Understand the full request-to-response data flow:**
   - HTTP Method + URL path
   - Request body → DTO → Validation → Service → Entity → Repository → Database
   - Database → Entity → Mapper → Response DTO → HTTP Response (with status code)

3. **Check if similar endpoints exist** — this is your convention template:
   - Search for endpoints with similar patterns (CRUD, third-party integration, batch processing)
   - If a direct match exists: mirror its structure exactly
   - If no direct match: identify the closest analog and adapt its pattern
   - Note deviations you plan to make and discuss with team

4. **Check security requirements:**
   - Does this endpoint need authentication? What role/permission?
   - Should it be added to any security configuration?

5. **Plan your test coverage:**
   - Unit tests for the service layer (happy path + error paths)
   - Controller tests with MockMvc (request validation, response structure)
   - Integration tests if the feature involves DB or external calls

### 5.2 Bug Fix

1. **Reproduce the issue locally first** — do not start fixing until you can see the bug:
   - Get the exact input that triggers the bug (from the ticket, logs, or QA)
   - Hit the endpoint with Postman or write a failing test
   - Confirm you see the same error/wrong output

2. **Analyse the stack trace** (if available):
   - Identify the **faulty layer**: Is it a Controller validation issue? Service logic error? Repository/query problem? Data issue?
   - Read the full stack trace bottom-to-top to find the root cause class and line number
   - (See Appendix E for Spring Boot stack trace reading guide)

3. **Identify the root cause vs. the symptom:**
   - The bug report describes the symptom (e.g., "API returns 500")
   - The root cause is deeper (e.g., "NullPointerException because the mapper does not handle null optional fields")
   - Fix the root cause, not just the symptom

4. **Check for related occurrences:**
   - `Ctrl+Shift+F` search for the same pattern elsewhere — if this bug exists in one place, it likely exists in similar code
   - Check if there is a common utility/helper that should be fixed instead of patching each call site

5. **Write a failing test BEFORE fixing:**
   - This proves the bug exists and prevents regression
   - The test should fail now and pass after your fix

### 5.3 Refactor

1. **Document current behaviour that must be preserved:**
   - List every public method signature that external callers depend on
   - List every API endpoint contract (URL, request, response) that must not change
   - List every side effect (database writes, events published, third-party calls)

2. **Assess existing test coverage:**
   - Run tests with coverage: `./gradlew test jacocoTestReport` (if Jacoco is configured)
   - If coverage is low, **write tests BEFORE refactoring** to lock in current behaviour
   - Every test that passes now must pass after refactoring

3. **List all callers of the code being changed:**
   - Use `Alt+F7` (Find Usages) on every public method you plan to change
   - If callers span multiple modules, the refactor may need coordination with other teams

4. **Plan incremental refactoring steps:**
   - Break the refactor into small, individually testable steps
   - Each step should leave the code in a working, deployable state

### 5.4 Performance

1. **Identify the bottleneck layer:**
   - Is it the database query? (Check query plan with `EXPLAIN ANALYZE`)
   - Is it the application logic? (Profile with VisualVM, JFR, or Async Profiler)
   - Is it the network/external call? (Check timeouts, connection pooling)
   - Is it serialisation/deserialisation? (Large payloads, inefficient mapping)

2. **Gather baseline metrics:**
   - Current response time (P50, P95, P99)
   - Current throughput (requests/second)
   - Current memory usage
   - Current DB query execution time

3. **Note existing patterns:**
   - Is caching already used? (`@Cacheable`, Redis, Caffeine)
   - Are there async patterns? (`@Async`, `CompletableFuture`, reactive)
   - Are there connection pools configured? (HikariCP settings)
   - Are there batch processing patterns?

4. **Define target metrics:**
   - What performance level does the ticket require?
   - How will you measure success?

---

## Phase 6 — Migration Ticket Preparation (Special Phase)

**Purpose:** Migration tickets are the highest-risk ticket type. They change the foundational structure without changing business logic. Skipping any step here leads to broken builds, runtime errors, or compliance failures.

### 6.1 Read the Target Framework Documentation FIRST

1. **Locate the company-provided framework documentation** — this is the single source of truth:
   - Confluence pages, internal wikis, shared documents
   - Framework team's README or migration guide
   - Sample/reference applications built on the new framework

2. **Read it end-to-end before writing a single line of code:**
   - Understand the philosophy and design decisions
   - Note mandatory vs. optional changes
   - Note any deprecated patterns that must be replaced

3. **Create your own summary of key changes** — this forces comprehension:
   - Write a bullet list of "things that change" in your own words
   - This will also serve as your PR description later

### 6.2 Create Side-by-Side Legacy → Modern Mapping

Build a mapping table for every category:

#### 6.2.1 Dependency Mapping

| Legacy Dependency | Action | Modern Replacement | Notes |
|------------------|--------|-------------------|-------|
| `spring-boot-starter-web` 2.x | **Upgrade** | `spring-boot-starter-web` 3.x | Jakarta namespace change |
| `javax.validation` | **Replace** | `jakarta.validation` | Package rename |
| `springfox-swagger2` | **Remove + Replace** | `springdoc-openapi-starter` | Completely different library |
| Custom internal library v1 | **Upgrade** | Custom internal library v2 | Check breaking changes |

#### 6.2.2 Annotation / API Mapping

| Legacy Pattern | Modern Pattern | Scope of Change |
|---------------|---------------|-----------------|
| `javax.persistence.*` | `jakarta.persistence.*` | All entity classes |
| `javax.servlet.*` | `jakarta.servlet.*` | Filters, interceptors |
| Custom `@LegacyEndpoint` | Standard `@RestController` | Controllers |
| XML bean definitions | Java `@Configuration` | Config files |

#### 6.2.3 Configuration Mapping

| Legacy Config | Modern Config | Notes |
|--------------|--------------|-------|
| `application.properties` flat keys | `application.yml` nested | Check property key renames |
| Custom security XML | `SecurityFilterChain` bean | Spring Security 6.x migration |
| Manual DataSource config | Auto-configuration with properties | May simplify code |

#### 6.2.4 Structural Changes

| Element | Legacy Structure | Modern Structure |
|---------|-----------------|-----------------|
| Package base | `com.company.legacy.cards` | `com.company.cards` |
| Config location | `src/main/resources/spring/*.xml` | `src/main/java/**/config/` |
| Test structure | `src/test/java` flat | `src/test/java` mirroring main |

### 6.3 Plan Migration in Incremental Slices

1. **Slice 1 — Dependencies only:** Update `build.gradle`, fix imports, confirm it compiles
2. **Slice 2 — Configuration:** Migrate XML configs to Java configs, update properties
3. **Slice 3 — Annotations and API changes:** Replace deprecated annotations, update method signatures
4. **Slice 4 — Structural changes:** Package restructuring, new base classes
5. **Slice 5 — Test migration:** Update test infrastructure, fix broken tests
6. **Each slice must compile and all existing tests must pass before moving to the next**

### 6.4 What AI Can and Cannot Do in Migrations

| AI Can Help With | AI Cannot Reliably Do |
|-----------------|----------------------|
| Replacing import statements (`javax` → `jakarta`) | Understanding your company's custom framework conventions |
| Suggesting modern equivalents for deprecated APIs | Knowing which optional migration steps your team chose to adopt |
| Generating updated test code | Understanding runtime behavior changes between versions |
| Converting XML config to Java `@Configuration` | Knowing your team's preferences when multiple valid approaches exist |
| Bulk find-and-replace patterns | Verifying that the migrated code actually works at runtime |

**Key rule:** Always provide the AI with the target framework documentation as context. Never ask it to "just migrate" without specifying the target.

---

## Phase 7 — Crafting the AI Prompt (GitHub Copilot Focus)

**Purpose:** Write structured, context-rich prompts that produce accurate, convention-compliant output on the first attempt. A vague prompt produces vague code.

### 7.1 What to Always Include in Every Prompt

Every prompt to Copilot Chat (or inline comment-driven completion) should include:

1. **Language and framework version:** "Java 17, Spring Boot 3.2, Gradle"
2. **Task type:** "Create a new REST endpoint" / "Fix a NullPointerException" / "Refactor this method"
3. **Relevant code snippet:** Paste the existing similar implementation you found in Phase 2
4. **Constraints and conventions:** State explicitly: "Follow this naming pattern: ...", "Use this exception hierarchy: ...", "Return responses in this wrapper: ..."
5. **What NOT to do:** "Do not use Lombok @Data on entities", "Do not use Spring Data REST", "Do not create new exceptions — use the existing CardNotFoundException"

### 7.2 Prompting Techniques for GitHub Copilot

#### 7.2.1 Copilot Chat (Sidebar) — Best for Full Class Generation

```
I need a new Spring Boot REST controller for managing card limits.

## Tech Stack
- Java 17, Spring Boot 3.2.4, Gradle
- Lombok for boilerplate (@Slf4j, @RequiredArgsConstructor)
- MapStruct for DTO mapping
- Jakarta Validation on DTOs

## Conventions (from existing code)
- Controllers extend nothing, annotated with @RestController and @RequestMapping
- All responses wrapped in ApiResponse<T>
- Service layer uses interface + impl pattern
- Method naming: get{Entity}, create{Entity}, update{Entity}
- Exceptions handled globally via @RestControllerAdvice

## Similar existing controller for reference:
[PASTE the similar controller code here]

## What I need:
- GET /api/v1/cards/{cardId}/limits — returns card limits
- POST /api/v1/cards/{cardId}/limits — creates a new limit
- PUT /api/v1/cards/{cardId}/limits/{limitId} — updates existing limit

## Constraints:
- cardId must be validated as positive Long
- Use existing CardNotFoundException if card not found
- Log at INFO level for successful operations
```

#### 7.2.2 Copilot Inline (Tab Completion) — Best for Method Bodies

- Write a clear method signature + Javadoc comment, then let Copilot complete the body:

```java
/**
 * Retrieves the card limits for a given card.
 * Throws CardNotFoundException if the card does not exist.
 * Returns limits sorted by creation date descending.
 *
 * @param cardId the card identifier
 * @return list of CardLimitResponse DTOs wrapped in ApiResponse
 */
public ApiResponse<List<CardLimitResponse>> getCardLimits(Long cardId) {
    // Copilot will complete here based on the context
}
```

- **Tip:** Open the relevant entity, repository, and service files in adjacent IDE tabs — Copilot uses open files as context.

#### 7.2.3 Copilot for JAXB/XML-Specific Tasks

When prompting for JAXB work, always include:

```
## XML/JAXB Context
- We use JAXB for XML marshalling/unmarshalling
- XSD file location: [path or paste the XSD]
- Existing JAXB model example:
[PASTE an existing @XmlRootElement class]

- Marshalling pattern used in codebase:
[PASTE the existing marshaller setup code]

## Task:
Generate a JAXB model class for [describe the XML structure]
that follows the same pattern as the example above.
```

#### 7.2.4 Copilot for Migration Tasks

```
## Migration Task
Migrate the following legacy code to the modern framework.

## Legacy code:
[PASTE legacy code]

## Target framework pattern (from company documentation):
[PASTE the modern equivalent pattern or example]

## Mapping rules:
- javax.persistence → jakarta.persistence
- Custom @LegacyService → standard @Service
- [any other specific mappings from Phase 6]

## Requirements:
- Preserve all existing business logic
- Keep all method signatures identical
- Update only the framework-specific code
```

### 7.3 Iterative Refinement Strategy

When the first output misses the mark:

1. **Identify specifically what is wrong** — do not say "this is wrong, fix it"
2. **Provide the correction context:**
   - "The exception handling is wrong. In our codebase, we throw CardBusinessException, not ResponseStatusException. Here is the pattern: [paste example]"
3. **Ask for only the changed part** — do not regenerate the whole class if only one method is wrong
4. **If Copilot keeps getting it wrong after 2 attempts:** Stop. Write the code manually using the convention reference from Phase 3. AI is a tool, not a crutch.

### 7.4 Prompt Templates

#### Template A — New Endpoint

```
Create a [HTTP Method] endpoint at [URL path] in the [module name] module.

Stack: Java [version], Spring Boot [version], Gradle
Conventions:
- [List 3-5 key conventions from Phase 3]

Similar existing endpoint for reference:
[Paste code]

Request body: [Paste DTO or describe structure]
Response body: [Paste DTO or describe structure]
Business logic: [Describe step by step]
Error cases: [List each error and expected response]

Do NOT: [List anti-patterns to avoid]
```

#### Template B — Bug Fix

```
Fix the following bug in [class name]:

Bug description: [What happens vs. what should happen]
Root cause analysis: [Your analysis from Phase 5.2]
Stack trace: [Paste relevant portion]

Current code:
[Paste the buggy method]

Expected behaviour:
[Describe correct behaviour step by step]

Constraints:
- Do not change the method signature
- Follow existing exception handling pattern: [paste example]
- Add appropriate logging
```

#### Template C — Refactor

```
Refactor the following [class/method] while preserving all existing behaviour:

Current code:
[Paste current code]

Callers of this code:
[List the callers identified in Phase 5.3]

Refactoring goal: [e.g., extract method, introduce interface, reduce complexity]

Conventions to follow:
[List from Phase 3]

All these tests must still pass after refactoring:
[List test class names]
```

#### Template D — Migration

```
Migrate the following code from [legacy framework] to [modern framework]:

Legacy code:
[Paste]

Target framework documentation excerpt:
[Paste relevant section]

Mapping rules:
[Paste from Phase 6.2]

Requirements:
- All business logic must be preserved exactly
- Method signatures must not change
- Only framework-specific code should change
- Follow the company's structural conventions: [list]
```

---

## Phase 8 — Post-AI Output Validation Checklist

**Purpose:** Every line of AI-generated code must be verified before it enters your codebase. AI tools are confident but frequently wrong about project-specific conventions.

### 8.1 Convention Compliance (Cross-reference Phase 3)

- [ ] **Naming:** Do class, method, and variable names follow the team's discovered conventions?
- [ ] **Package placement:** Is the new class in the correct package?
- [ ] **Layer separation:** Does the Controller only delegate to the Service? Does the Service contain business logic, not the Controller?
- [ ] **Base class inheritance:** Does the class extend the correct base class (if one exists)?
- [ ] **Annotations:** Are the correct Lombok, Spring, and validation annotations used?

### 8.2 Spring Layer Correctness

- [ ] **Dependency injection:** Is constructor injection used (not field injection with `@Autowired`)?
- [ ] **Bean scope:** Are beans correctly scoped? (Default singleton is usually correct)
- [ ] **Transaction management:** Is `@Transactional` placed correctly on service methods?
- [ ] **Profile activation:** Are any profile-specific beans or configs correctly annotated?

### 8.3 Error Handling

- [ ] Does exception handling match the team's existing hierarchy? (Not generic `RuntimeException`)
- [ ] Are custom error codes used correctly?
- [ ] Is the global exception handler expected to catch these exceptions?
- [ ] Are error responses in the standard format?

### 8.4 Security

- [ ] Is the new endpoint properly secured? (Not accidentally public)
- [ ] Are sensitive fields not exposed in the response? (Card numbers, CVVs, PINs)
- [ ] Are input validations in place to prevent injection attacks?
- [ ] Is PII/PAN data handled according to PCI-DSS requirements?

### 8.5 Gradle Dependencies

- [ ] Are there any **new dependencies** the AI added that are not in the existing `build.gradle`?
- [ ] If new dependencies are needed, are they compatible with the existing BOM?
- [ ] Did the AI accidentally downgrade or change any existing dependency version?

### 8.6 JAXB/XML Specific (if applicable)

- [ ] Is the marshalling/unmarshalling aligned with the existing XML handling pattern?
- [ ] Are namespace declarations correct?
- [ ] Are XML element names matching the XSD?
- [ ] Is the JAXB context/marshaller reused (not created per request)?

### 8.7 Migration Specific (if applicable)

- [ ] Does the migrated code fully comply with the company framework documentation?
- [ ] Are ALL legacy imports replaced? (`javax` → `jakarta` etc.)
- [ ] Do all existing tests pass against the migrated code?
- [ ] Are there any deprecated API usages remaining?

### 8.8 Code Quality

- [ ] **No hardcoded values** — are magic strings/numbers extracted to constants or config?
- [ ] **Null safety** — are potential null values handled? (`Optional`, null checks, `@Nullable`)
- [ ] **Resource management** — are streams, connections, and resources properly closed? (`try-with-resources`)
- [ ] **Thread safety** — if shared state exists, is it properly synchronized?
- [ ] **Logging** — are appropriate log statements present at correct levels?
- [ ] **No commented-out code** — AI sometimes leaves dead code

### 8.9 Testability

- [ ] Is the code unit-testable? (Dependencies are injectable, not hardcoded)
- [ ] Are unit test stubs needed? Generate them.
- [ ] Are integration test stubs needed? Generate them.
- [ ] Do all existing tests still pass? Run: `./gradlew test`

### 8.10 Final Sanity

- [ ] Read the AI-generated code line by line — **understand every line**
- [ ] If you cannot explain what a line does, **do not commit it**
- [ ] Does the code solve the JIRA ticket requirements? Cross-reference with Phase 1 acceptance criteria
- [ ] Is this code you would be comfortable explaining in a code review?

---

## Phase 9 — Debugging & API Testing SOP

**Purpose:** Systematically debug issues using the right tool for the right layer. API testing is not just "hitting the endpoint" — it is structured verification at every layer.

### 9.1 Postman — API-Level Testing

#### Setting Up a Postman Collection (Do This Once Per Service)

1. **Create a collection** named after your service: `card-limits-service`
2. **Create an environment** with variables:
   - `baseUrl` = `http://localhost:8080` (or your local port)
   - `authToken` = your JWT/API key for local testing
   - `cardId` = a test card ID from your local DB
3. **Create folders** for each endpoint group: `Card Limits`, `Card Accounts`, etc.
4. **Save example requests** for every endpoint — these become your regression suite

#### Structured Testing with Postman

For each endpoint, create and test these requests in order:

1. **Happy path** — valid request with valid data → expected 200/201 response
2. **Validation failure** — missing required fields → expected 400 response with validation errors
3. **Not found** — non-existent ID → expected 404 response
4. **Unauthorized** — no auth token → expected 401 response
5. **Forbidden** — valid token but wrong role → expected 403 response
6. **Edge cases** — empty arrays, maximum length strings, boundary values, special characters

#### Reading Postman Responses

- **Status code** — does it match your expected code?
- **Response body** — does it match the expected structure from your DTO?
- **Response headers** — check `Content-Type`, correlation ID, custom headers
- **Response time** — if over 2 seconds for a simple query, investigate

#### Postman Pre-Request Scripts (Useful for Auth)

```javascript
// Auto-refresh token before each request
pm.sendRequest({
    url: pm.environment.get("baseUrl") + "/auth/token",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: { mode: "raw", raw: JSON.stringify({ username: "test", password: "test" }) }
}, function(err, res) {
    pm.environment.set("authToken", res.json().token);
});
```

### 9.2 Chrome DevTools — Frontend-to-Backend Debugging

Use when your Spring Boot service is called from a React frontend:

1. **Network Tab** — The most important tab for API debugging:
   - Filter by `XHR` or `Fetch` to see only API calls
   - Click on a request to see:
     - **Headers tab:** Request URL, method, request headers (check `Authorization`, `Content-Type`)
     - **Payload tab:** The request body your frontend sent
     - **Response tab:** The raw response from your backend
     - **Timing tab:** How long the backend took to respond
   - **Red requests** (4xx/5xx) — click to see the error response body

2. **Console Tab:**
   - Check for JavaScript errors that may prevent the API call from being made
   - Add `console.log()` in your React code to verify the request payload before it is sent

3. **Common debugging patterns:**
   - **CORS errors** — "Access-Control-Allow-Origin" missing → check your Spring `@CrossOrigin` or `WebMvcConfigurer` CORS config
   - **401 Unauthorized** — token expired or not attached → check your React auth interceptor (Axios/Fetch headers)
   - **Request payload mismatch** — frontend sends camelCase, backend expects snake_case → check `@JsonProperty` annotations or Jackson config
   - **415 Unsupported Media Type** — missing `Content-Type: application/json` header

### 9.3 IDE Debugger (IntelliJ) — Code-Level Debugging

#### Setting Up Breakpoints Strategically

Do not set random breakpoints. Place them at **layer boundaries**:

1. **Controller method entry** — verify the request is deserialized correctly
2. **Service method entry** — verify the controller passed the right parameters
3. **Before external call** — verify the request being sent to third-party/DB
4. **After external call** — verify the response received
5. **Before return** — verify the response DTO is correctly built

#### Breakpoint Types (IntelliJ-Specific)

| Type | When to Use | How to Set |
|------|------------|------------|
| **Line breakpoint** | Stop at a specific line | Click the gutter (left margin) |
| **Conditional breakpoint** | Stop only when a condition is true (e.g., `cardId == 12345`) | Right-click breakpoint → add condition |
| **Exception breakpoint** | Stop when a specific exception is thrown (even if caught) | Run → View Breakpoints → + → Java Exception Breakpoint |
| **Method breakpoint** | Stop at method entry/exit | Breakpoint on method signature line |
| **Field watchpoint** | Stop when a field value changes | Breakpoint on field declaration |

#### Debugger Variables Panel

- **Evaluate Expression** (`Alt+F8`): Run any Java expression at the current breakpoint — e.g., `cardEntity.getStatus().name()` or `mapper.toResponse(entity)`
- **Watch variables**: Add frequently checked variables to the Watches panel
- **Step Over** (`F8`): Execute current line, move to next
- **Step Into** (`F7`): Enter the method being called
- **Step Out** (`Shift+F8`): Finish current method, return to caller
- **Resume** (`F9`): Continue to next breakpoint

#### Debugging Spring-Specific Issues

| Symptom | Where to Debug | What to Check |
|---------|---------------|---------------|
| Request never reaches Controller | `DispatcherServlet`, Security Filters | Security config blocking the URL, wrong HTTP method |
| Controller receives null fields | Controller method parameter | `@RequestBody` missing, Jackson deserialization failure |
| Service throws unexpected exception | Service method | Null entity from repository, wrong business logic |
| Repository returns wrong data | Repository method or `@Query` | Check the actual SQL being generated (enable `spring.jpa.show-sql=true`) |
| Response has missing fields | Mapper or Response DTO | Mapper not mapping a field, DTO field name mismatch |

### 9.4 Application Logs — Log-Level Debugging

1. **Enable SQL logging temporarily** (for DB issues):
   ```yaml
   # application.yml (local profile only)
   spring:
     jpa:
       show-sql: true
       properties:
         hibernate:
           format_sql: true
   logging:
     level:
       org.hibernate.SQL: DEBUG
       org.hibernate.type.descriptor.sql.BasicBinder: TRACE  # shows parameter values
   ```

2. **Enable request/response logging** (for API issues):
   ```yaml
   logging:
     level:
       org.springframework.web: DEBUG
       org.springframework.web.servlet.DispatcherServlet: TRACE
   ```

3. **Reading Spring Boot stack traces** — see Appendix E for a detailed guide

4. **Correlation ID tracing** — if your service uses MDC or Sleuth/Micrometer:
   - Copy the trace ID from the response header
   - Search logs with: `grep "traceId=abc123" application.log`
   - This gives you the complete request lifecycle across all log statements

### 9.5 Debugging Decision Tree

```
Issue: API not working as expected
│
├── Can you hit the endpoint at all?
│   ├── NO → Check: Is the server running? Correct port? Correct URL path?
│   │         Check: Security config blocking? CORS? Firewall?
│   └── YES → Continue
│
├── Is the response status code correct?
│   ├── 401/403 → Authentication/authorization issue → Check security config, token
│   ├── 404 → Wrong URL or missing @RequestMapping → Check controller annotations
│   ├── 400 → Request validation failed → Check request body against DTO validation
│   ├── 500 → Server error → Check application logs for stack trace
│   └── 200 but wrong data → Continue
│
├── Is the request reaching the Controller?
│   ├── NO → Breakpoint in DispatcherServlet, check filters
│   └── YES → Continue
│
├── Is the Service receiving correct parameters?
│   ├── NO → Issue in Controller → deserialization or mapping
│   └── YES → Continue
│
├── Is the Repository returning correct data?
│   ├── NO → Issue in query → enable SQL logging, check query
│   └── YES → Continue
│
└── Is the Response DTO correct?
    ├── NO → Issue in Mapper → breakpoint in mapper
    └── YES → Issue is in the HTTP response serialization → check Jackson config
```

---

## Phase 10 — Git Workflow & PR Submission Checklist

**Purpose:** Ensure your code is properly committed, branched, and submitted for review. A sloppy PR slows down the entire team.

### 10.1 Branch Management

1. **Create a feature branch from the latest develop/main:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/JIRA-1234-add-card-limits-endpoint
   ```
2. **Branch naming convention** (adapt to your team's standard):
   - `feature/JIRA-XXXX-short-description`
   - `bugfix/JIRA-XXXX-short-description`
   - `refactor/JIRA-XXXX-short-description`

3. **Commit frequently with meaningful messages:**
   ```
   feat(card-limits): add CardLimit entity and repository
   feat(card-limits): implement CardLimitService with create and get methods
   fix(card-limits): handle null card ID in limit creation
   test(card-limits): add unit tests for CardLimitService
   ```

4. **Rebase before creating PR** (keep history clean):
   ```bash
   git fetch origin develop
   git rebase origin/develop
   # Resolve any conflicts
   ./gradlew clean build  # Verify build after rebase
   ```

### 10.2 Pre-PR Self-Review Checklist

Before creating the PR, do a self-review:

1. **Run the full build:** `./gradlew clean build`
2. **Run all tests:** `./gradlew test` — all must pass
3. **Run static analysis** (if configured): `./gradlew checkstyleMain`, `./gradlew spotbugsMain`
4. **Review your own diff:**
   ```bash
   git diff develop..HEAD
   ```
   - Look for: debug print statements, TODO comments, hardcoded test values, accidental file changes
5. **Check for unintended file changes:** `git status` — are there any files you did not mean to modify?
6. **Verify Gradle dependency lock files** (if used) are not accidentally changed

### 10.3 PR Description Template

```markdown
## JIRA Ticket
[JIRA-1234](https://your-jira-url/browse/JIRA-1234)

## What Changed
- [Concise description of what was added/changed/fixed]

## Why
- [Business context — what problem does this solve?]

## How
- [Technical approach — which layers were modified, what pattern was followed]

## Testing Done
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested with Postman
- [ ] Tested edge cases: [list specific ones]

## Screenshots / Postman Results
[If applicable, paste Postman response or UI screenshot]

## Checklist
- [ ] Code follows team conventions
- [ ] No hardcoded values
- [ ] Exception handling follows team pattern
- [ ] Logging added at appropriate levels
- [ ] Sensitive data is not logged or exposed
- [ ] All tests pass locally
- [ ] Rebased on latest develop
```

### 10.4 Responding to Code Review Feedback

1. **Do not take feedback personally** — code review is about the code, not you
2. **Ask clarifying questions** if the reviewer's comment is unclear
3. **Make the suggested change** and push a new commit — do not squash until the reviewer approves
4. **Reply to each comment** with "Done" or explain why you chose a different approach
5. **Request re-review** after addressing all comments

---

## Phase 11 — Knowledge Capture & Growth Loop

**Purpose:** Every ticket you complete is a learning opportunity. Capture what you learned so that future tickets in the same area take half the time.

### 11.1 Post-Ticket Notes (5 Minutes After Merging)

After each ticket, spend 5 minutes writing a quick note answering:

1. **What conventions did I discover?** (Add to your personal Phase 3 checklist)
2. **What was the trickiest part?** (So you know where to focus next time)
3. **What did the AI tool get right/wrong?** (Refine your prompting approach)
4. **What did the code reviewer point out?** (This is free mentorship — absorb it)
5. **What related area of the codebase did I learn about?** (Expands your mental map)

### 11.2 Build Your Personal Codebase Map

Maintain a simple document mapping:

```
Module: card-limits-service
├── Controllers: CardLimitController (GET/POST/PUT endpoints)
├── Services: CardLimitServiceImpl (validation + business logic)
├── Repositories: CardLimitRepository (JPA, custom queries for active limits)
├── Key Patterns: Uses ApiResponse wrapper, CardBusinessException for errors
├── Tests: MockMvc for controllers, Mockito for services
└── Last touched: JIRA-1234 (Jan 2026)
```

This becomes your personal navigation index — faster than searching every time.

### 11.3 Weekly Skill Investment (30 Minutes)

Pick one area per week to deepen your understanding:

- Week 1: Read the Spring Security configuration end-to-end
- Week 2: Understand the Gradle build pipeline and custom tasks
- Week 3: Read the global exception handler and all custom exceptions
- Week 4: Run and understand all integration tests
- Week 5: Read the CI/CD pipeline config (Jenkinsfile/GitHub Actions)

This compounds. After 3 months, you will have significantly deeper codebase knowledge than when you started.

---

---

# APPENDICES

---

## Appendix A — Worked Example: New Endpoint (Ticket A)

**Ticket:** "Expose an endpoint that checks if the company name/ID in the request body is a Test company. If yes, add the IES key to the request before forwarding it to the third-party system. Receive and return the third-party response. Integration uses XML with JAXB."

---

### Phase 1 — Understand the JIRA Ticket (Filled)

| Item | Value |
|------|-------|
| **Ticket Type** | New Feature / New Endpoint |
| **Business Intent** | When a request comes in with a company name/ID, check if it is a test company. If so, inject the IES key into the request before forwarding to the third-party system. Return whatever the third-party system responds with. |
| **Integration Protocol** | XML over HTTP, using JAXB for marshalling/unmarshalling |
| **Acceptance Criteria** | 1. Endpoint accepts company name/ID in request body. 2. Endpoint identifies test companies (need to clarify: from DB? config? hardcoded list?). 3. If test company, IES key is added to the outbound request. 4. Third-party response is received and returned to the caller. 5. Non-test companies — clarify: should they be forwarded without IES key, or rejected? |
| **Ambiguities to Clarify** | 1. What is the source of "test company" data? (DB table, config file, enum?) 2. What is the IES key? Where is it stored? (Vault, properties, DB?) 3. What happens for non-test companies? (Forward without key? Return error?) 4. What is the third-party system's endpoint URL, authentication, and timeout? 5. What is the exact XML structure expected by the third-party? (Need XSD or sample XML) 6. What HTTP method and URL path should this endpoint use? |
| **Referenced Systems** | Third-party system (name TBD), IES key management, test company registry |
| **Edge Cases** | 1. Company ID not found in system 2. Third-party system is down / times out 3. Third-party returns error XML 4. Invalid XML in response 5. IES key is expired or missing |

---

### Phase 2 — Codebase Exploration (Filled)

| Step | Action Taken | Result |
|------|-------------|--------|
| **Gradle module** | Checked `settings.gradle` for module list | Identified `card-integration-service` module handles third-party integrations |
| **Controller search** | `Ctrl+Shift+F` → `@RestController` in integration module | Found `ThirdPartyIntegrationController` with similar endpoints |
| **Similar implementation** | Searched for `@XmlRootElement` and `Marshaller` | Found `CompanyVerificationService` that already calls a third-party via XML — this is the convention reference |
| **Data flow trace** | Traced `CompanyVerificationController` → `CompanyVerificationService` → `ThirdPartyXmlClient` → HTTP call → unmarshal response | Confirmed the pattern: Controller → Service → XML Client wrapper → RestTemplate with XML message converter |
| **Test patterns** | Found `CompanyVerificationServiceTest` using Mockito, `CompanyVerificationControllerTest` using MockMvc + WireMock for third-party | WireMock is used to mock third-party XML endpoints in integration tests |
| **Config check** | `application.yml` search for third-party URLs | Found `thirdparty.company-verification.url` and `thirdparty.company-verification.timeout-ms` — follow this naming pattern |

---

### Phase 3 — Convention Discovery (Filled — Key Entries)

| Convention | Discovered Pattern |
|-----------|-------------------|
| Controller naming | `{Domain}IntegrationController` |
| Service naming | `{Domain}IntegrationService` / `{Domain}IntegrationServiceImpl` |
| XML Client class | `ThirdPartyXmlClient` — shared utility class with `sendXmlRequest(Object jaxbObject, Class<T> responseType)` method |
| Request DTO | `{Action}{Domain}Request` — e.g., `VerifyCompanyRequest` |
| Response DTO | `{Domain}Response` — wraps the third-party response data |
| Exception handling | `ThirdPartyIntegrationException` (extends `BusinessException`) for all external call failures |
| Logging | `@Slf4j`, INFO for request/response (with masked sensitive fields), ERROR for third-party failures |
| JAXB pattern | JAXB models in `*.model.xml` package, `@XmlRootElement`, `@XmlElement`, shared `JaxbContext` bean in config |
| IES key injection | Need to check — search for "IES" in codebase to see if a similar injection pattern exists |

---

### Phase 4 — Context Gathering (Filled)

| Context Item | Status | Notes |
|-------------|--------|-------|
| Similar Controller | Open in IDE | `CompanyVerificationController.java` |
| Similar Service | Open in IDE | `CompanyVerificationServiceImpl.java` |
| XML Client utility | Open in IDE | `ThirdPartyXmlClient.java` |
| JAXB model example | Open in IDE | `CompanyVerificationXmlRequest.java` (has `@XmlRootElement`) |
| JAXB config | Open in IDE | `JaxbConfiguration.java` (creates `JaxbContext` bean) |
| Exception hierarchy | Open in IDE | `ThirdPartyIntegrationException.java`, `BusinessException.java` |
| Global error handler | Open in IDE | `GlobalExceptionHandler.java` |
| application.yml | Open in IDE | Third-party URL pattern noted |
| XSD / XML samples | **NEEDED** | Must request from team — what XML does the third-party expect? |
| IES key source | **NEEDED** | Must clarify — where is the IES key stored and how is it retrieved? |
| Test company list | **NEEDED** | Must clarify — how to determine if a company is a "test company" |
| build.gradle | Reviewed | JAXB dependencies already present in module |

---

### Phase 7 — AI Prompt (Filled)

```
Create a new Spring Boot REST endpoint for the IES key injection and third-party
forwarding feature in the card-integration-service module.

## Tech Stack
- Java 17, Spring Boot 3.2.4, Gradle
- JAXB for XML marshalling/unmarshalling
- Lombok (@Slf4j, @RequiredArgsConstructor, @Builder)
- Jakarta Validation on request DTOs

## Existing Convention Reference
Here is an existing similar controller and service that calls a third-party
system using XML:

### Existing Controller:
[PASTE CompanyVerificationController.java]

### Existing Service:
[PASTE CompanyVerificationServiceImpl.java]

### Existing XML Client:
[PASTE ThirdPartyXmlClient.java]

### Existing JAXB model:
[PASTE CompanyVerificationXmlRequest.java]

## What I Need
1. A new Controller: `IesCompanyCheckController`
   - POST /api/v1/integration/ies-company-check
   - Accepts `IesCompanyCheckRequest` with companyName and companyId fields
   - Returns `ApiResponse<IesCompanyCheckResponse>`

2. A new Service: `IesCompanyCheckService` (interface + impl)
   - Checks if the company is a test company (lookup from [DB table / config])
   - If test company: adds IES key (from application.yml property
     `integration.ies.key`) to the outbound XML request
   - Calls third-party using the existing ThirdPartyXmlClient pattern
   - Maps the XML response back to a response DTO

3. JAXB model classes: `IesCompanyXmlRequest` and `IesCompanyXmlResponse`
   - Following the same pattern as CompanyVerificationXmlRequest
   - XSD structure: [PASTE XSD or describe XML structure]

## Error Handling
- Company not found → throw BusinessException with error code COMPANY_NOT_FOUND
- Third-party timeout → throw ThirdPartyIntegrationException
- Invalid XML response → throw ThirdPartyIntegrationException with parsing error

## Constraints
- Follow the EXACT same layering and naming patterns as the existing
  CompanyVerification feature
- Use the existing ThirdPartyXmlClient, do not create a new HTTP client
- Mask the IES key in all log statements
- Do not hardcode the IES key — read from configuration
```

---

## Appendix B — Worked Example: Migration (Ticket B)

**Ticket:** "Migrate the existing legacy codebase to the modern, company-provided compliant framework. Align with the latest practices, structure, and dependencies as specified in the company framework documentation."

---

### Phase 1 — Understand the JIRA Ticket (Filled)

| Item | Value |
|------|-------|
| **Ticket Type** | Migration |
| **Business Intent** | Bring the codebase into compliance with the company's standard modern framework. This is a technical requirement, not a feature change — no business logic should change. |
| **Acceptance Criteria** | 1. All dependencies updated to company framework versions. 2. Package structure aligns with company standard. 3. Configuration migrated from legacy to modern style. 4. All existing tests pass after migration. 5. No runtime behaviour changes. 6. Build produces compliant artifact. |
| **Ambiguities to Clarify** | 1. Where is the company framework documentation? (Get the exact Confluence/wiki link) 2. Is there a reference application that already uses the new framework? 3. Should the migration be done in one PR or incremental PRs? 4. Are there any modules excluded from migration? 5. What is the deadline? (Affects whether to migrate incrementally or all at once) 6. Who is the framework team contact for migration questions? |
| **Risk Assessment** | HIGH — migration affects the entire codebase. Must be done incrementally with continuous testing. |

---

### Phase 6 — Migration Preparation (Filled)

#### 6.2.1 Dependency Mapping (Filled Example)

| Legacy Dependency | Action | Modern Replacement | Notes |
|------------------|--------|-------------------|-------|
| `org.springframework.boot:spring-boot-starter-parent:2.7.x` | **Upgrade** | `org.springframework.boot:spring-boot-starter-parent:3.2.x` | Major version — breaking changes |
| `javax.persistence:javax.persistence-api` | **Replace** | `jakarta.persistence:jakarta.persistence-api` | Namespace change |
| `javax.validation:validation-api` | **Replace** | `jakarta.validation:jakarta.validation-api` | Namespace change |
| `io.springfox:springfox-boot-starter:3.0.0` | **Remove + Add** | `org.springdoc:springdoc-openapi-starter-webmvc-ui:2.x` | Completely different library |
| `com.company.legacy:legacy-security-starter:1.x` | **Replace** | `com.company.modern:modern-security-starter:2.x` | Check migration guide for config changes |
| `com.company.legacy:legacy-logging-starter:1.x` | **Replace** | `com.company.modern:modern-logging-starter:2.x` | Log format may change |
| `org.hibernate:hibernate-core:5.x` | **Automatic** | `org.hibernate.orm:hibernate-core:6.x` | Comes with Spring Boot 3.x |

#### 6.2.2 Annotation Mapping (Filled Example)

| Legacy | Modern | Files Affected |
|--------|--------|---------------|
| `import javax.persistence.*` | `import jakarta.persistence.*` | All entity classes (~40 files) |
| `import javax.validation.*` | `import jakarta.validation.*` | All DTO classes (~30 files) |
| `import javax.servlet.*` | `import jakarta.servlet.*` | Filters, interceptors (~10 files) |
| `import javax.annotation.PostConstruct` | `import jakarta.annotation.PostConstruct` | Config/init classes (~5 files) |
| `@Autowired` on fields | Constructor injection (already using) | Verify — no changes if already compliant |

#### 6.2.3 Configuration Mapping (Filled Example)

| Legacy Config | Modern Config | Notes |
|--------------|--------------|-------|
| `spring.datasource.initialization-mode` | `spring.sql.init.mode` | Property renamed in Boot 3.x |
| `spring.jpa.properties.hibernate.dialect` (explicit) | Auto-detected | Can remove explicit dialect |
| `management.metrics.export.prometheus.enabled` | `management.prometheus.metrics.export.enabled` | Actuator property restructured |
| `@EnableSwagger2` | Remove entirely | springdoc auto-configures |
| Security: `WebSecurityConfigurerAdapter` | Security: `SecurityFilterChain` bean | Major pattern change |

#### Migration Slices (Planned)

| Slice | Scope | PR # | Test Verification |
|-------|-------|------|------------------|
| 1 | Gradle dependencies only — update BOM, fix compile errors | PR-1 | `./gradlew clean build` passes |
| 2 | `javax` → `jakarta` import changes (all files) | PR-2 | All tests pass |
| 3 | Spring Security migration (`WebSecurityConfigurerAdapter` → `SecurityFilterChain`) | PR-3 | Security integration tests pass |
| 4 | Swagger migration (Springfox → Springdoc) | PR-4 | Swagger UI accessible |
| 5 | Property file updates | PR-5 | All profiles boot correctly |
| 6 | Company framework starters migration | PR-6 | Full regression test suite |
| 7 | Cleanup — remove deprecated configs, dead code | PR-7 | Final review |

---

### Phase 7 — AI Prompt for Migration (Filled)

```
Migrate the following Spring Security configuration from Spring Boot 2.7
(WebSecurityConfigurerAdapter) to Spring Boot 3.2 (SecurityFilterChain).

## Legacy Code:
[PASTE the existing WebSecurityConfigurerAdapter class]

## Target Pattern (from company framework documentation):
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
        throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .build();
    }
}

## Requirements:
- Preserve ALL existing URL patterns and role configurations
- Preserve all custom filters (translate addFilterBefore/After calls)
- Replace deprecated methods with lambda-style DSL
- javax.servlet imports → jakarta.servlet imports
- Do not change any business logic
- Preserve the existing CORS configuration

## What NOT to do:
- Do not add new security rules that do not exist in the legacy code
- Do not remove any existing URL patterns
- Do not change the authentication mechanism
```

---

## Appendix C — Daily Quick-Reference Cheat Sheet

**Print this page or pin it. Follow it for every ticket.**

```
┌─────────────────────────────────────────────────────────────────┐
│                    TICKET WORKFLOW CHEAT SHEET                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ☐ PHASE 0 — Is my environment ready?                          │
│    Pull latest, build green, DB connected, Copilot active       │
│                                                                 │
│  ☐ PHASE 1 — Do I fully understand the ticket?                 │
│    Type? AC? Edge cases? Ambiguities clarified?                 │
│                                                                 │
│  ☐ PHASE 2 — Have I explored the codebase?                     │
│    Module? Controller→Service→Repo chain? Similar impl found?   │
│                                                                 │
│  ☐ PHASE 3 — Have I documented conventions?                    │
│    Naming? Error handling? Logging? Response wrapper?            │
│                                                                 │
│  ☐ PHASE 4 — Do I have all context gathered?                   │
│    Code open? Schema known? Config checked? Tests reviewed?     │
│                                                                 │
│  ☐ PHASE 5/6 — Ticket-type specific prep done?                 │
│    New=insertion point | Bug=reproduced | Refactor=tests first  │
│    Migration=mapping table complete                             │
│                                                                 │
│  ☐ PHASE 7 — Is my AI prompt structured?                       │
│    Stack + Task + Context + Conventions + Constraints            │
│                                                                 │
│  ☐ PHASE 8 — Have I validated AI output?                       │
│    Conventions? Layers? Exceptions? Security? Tests pass?       │
│                                                                 │
│  ☐ PHASE 9 — Have I tested the endpoint?                       │
│    Postman: happy + error + edge | Debugger if issues           │
│                                                                 │
│  ☐ PHASE 10 — Is my PR ready?                                  │
│    Self-review? Tests pass? Rebased? Description filled?        │
│                                                                 │
│  ☐ PHASE 11 — What did I learn?                                │
│    Conventions noted? Codebase map updated? Review absorbed?    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix D — Anti-Patterns: What Never to Do with AI Coding Tools

### D.1 Prompting Anti-Patterns

| Anti-Pattern | Why It Fails | Do This Instead |
|-------------|-------------|-----------------|
| "Create a REST endpoint for cards" | Too vague — AI has no convention context | Include stack version, conventions, similar code example |
| Accepting AI output without reading it | AI confidently generates wrong patterns | Read every line. If you cannot explain it, do not commit it. |
| Pasting the entire codebase as context | Token limits + noise drowns signal | Paste only the specific similar implementation and conventions |
| "Fix this bug" with no stack trace or context | AI will guess randomly | Include: stack trace, root cause analysis, expected vs actual |
| Asking AI to "figure out" your team's conventions | AI cannot read your private codebase | YOU discover conventions (Phase 3), then TELL the AI |
| Using AI-generated code in areas you do not understand at all | You cannot debug what you do not understand | Learn the concept first, then use AI to accelerate writing |
| Iterating 10+ times with AI hoping it will get right | Diminishing returns after 2-3 attempts | After 2 bad outputs, write it yourself using convention references |

### D.2 Code Anti-Patterns (AI Tools Commonly Generate These)

| Anti-Pattern | What AI Generates | What Your Codebase Actually Uses |
|-------------|-------------------|----------------------------------|
| Field injection | `@Autowired private SomeService service;` | Constructor injection via `@RequiredArgsConstructor` |
| Generic exceptions | `throw new RuntimeException("error")` | Team's custom exception hierarchy |
| Swagger v2 annotations | `@ApiOperation`, `@ApiParam` | Springdoc v2: `@Operation`, `@Parameter` |
| Manual null checks | `if (entity != null) { ... }` | `Optional<Entity>` from repository |
| System.out.println | `System.out.println("debug")` | `log.info()` / `log.debug()` with SLF4J |
| Hardcoded values | `timeout = 5000` | Config property: `@Value("${service.timeout-ms}")` |
| Raw SQL strings | `"SELECT * FROM cards WHERE id = ?"` | JPA repository methods or `@Query` with JPQL |

### D.3 Process Anti-Patterns

| Anti-Pattern | Better Approach |
|-------------|----------------|
| Starting to code before clarifying ambiguities | Ask questions FIRST, code SECOND |
| Skipping Phase 2 because "I think I know where it goes" | Always verify — assumptions break in large codebases |
| Not running tests before creating PR | Always: `./gradlew clean build test` before PR |
| Squashing all commits into one | Keep logical commits — easier to review and revert |
| Not updating your personal codebase map | 5 minutes of notes saves 30 minutes next time |

---

## Appendix E — Spring Boot Stack Trace Reading Guide

### How to Read a Stack Trace (Bottom to Top)

```
org.springframework.web.util.NestedServletException: Request processing failed
  at org.springframework.web.servlet.FrameworkServlet.processRequest(FrameworkServlet.java:1014)
  at org.springframework.web.servlet.FrameworkServlet.doPost(FrameworkServlet.java:909)
  ...
Caused by: com.company.cards.exception.BusinessException: Card not found
  at com.company.cards.service.impl.CardServiceImpl.getCard(CardServiceImpl.java:45)     ← ROOT CAUSE
  at com.company.cards.controller.CardController.getCardDetails(CardController.java:32)
  at sun.reflect.NativeMethodAccessorImpl.invoke0(Native Method)
  ...
```

**Reading order:**

1. **Start with "Caused by"** — this is the actual error
2. **Read the message:** "Card not found"
3. **Find YOUR code** (not Spring/library lines): `CardServiceImpl.java:45` — this is line 45 of your service
4. **Go to that line** in your IDE: `Ctrl+G` → enter line number
5. **Understand the context:** What is line 45 doing? What variable could be null?

### Common Spring Boot Errors and Their Meaning

| Error | Layer | Common Cause |
|-------|-------|-------------|
| `HttpMessageNotReadableException` | Controller | Request body JSON is malformed or does not match DTO |
| `MethodArgumentNotValidException` | Controller | `@Valid` validation failed — check DTO annotations |
| `NoHandlerFoundException` | DispatcherServlet | URL does not map to any controller — check `@RequestMapping` |
| `DataIntegrityViolationException` | Repository | DB constraint violated (unique key, not null, foreign key) |
| `LazyInitializationException` | Service/Controller | JPA entity relationship accessed outside session — add `@Transactional` or use fetch join |
| `BeanCreationException` | Startup | Spring cannot create a bean — check constructor dependencies, missing beans, circular dependencies |
| `HttpMediaTypeNotSupportedException` | Controller | Wrong `Content-Type` header — expected `application/json` but got something else |
| `AccessDeniedException` | Security Filter | User does not have required role/authority |
| `ConnectTimeoutException` | HTTP Client | Third-party service did not respond within timeout |
| `UnmarshalException` (JAXB) | XML Client | XML response does not match JAXB model — check element names and namespaces |

---

*End of SOP Document*

*Version: 1.0 | Created: April 2026 | Stack: Java 17 · Spring Boot 3.x · Gradle · GitHub Copilot*
