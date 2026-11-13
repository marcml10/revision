# AGENTS.md — Full-Stack Development Engineering Standards

**Purpose:** Professional Full-Stack Software Development  
**Scope:** Frontend, Backend, APIs, Databases, Infrastructure and Deployment  
**Audience:** AI Coding Agents and Development Assistants  
**Priority:** Mandatory Project Instructions

---

# 1. Engineering Principles

All development work MUST follow these principles:

1. Understand before implementing.
2. Prefer maintainable solutions over quick workarounds.
3. Follow the existing architecture and conventions.
4. Avoid unnecessary complexity and overengineering.
5. Write readable, modular and reusable code.
6. Prioritize security, reliability and performance.
7. Preserve existing functionality unless changes are explicitly requested.
8. Make the smallest reasonable change that solves the problem.
9. Never assume an implementation is correct without verification.
10. Explain significant architectural and technical decisions.

The objective is to build production-quality software, not merely code that appears to work.

# 2. Repository Inspection and Project Understanding

Before modifying an existing project, inspect its structure.

Understand:

- Application architecture.
- Frontend and backend technologies.
- Frameworks and libraries.
- Package management and dependency versions.
- Existing directory structure.
- Database technology and schema.
- API structure and communication patterns.
- Authentication and authorization mechanisms.
- Environment configuration.
- Build and deployment processes.
- Existing coding conventions.

Inspect relevant source files before introducing changes.

Do not assume that a project uses a particular framework, architecture, database or design pattern.

Do not introduce a new architectural approach without understanding the existing one.

For new projects, propose a reasonable architecture based on the actual requirements.

# 3. Development Planning

For non-trivial features, follow this workflow:

1. Understand the requirement.
2. Identify affected components.
3. Inspect relevant existing implementation.
4. Identify dependencies and potential risks.
5. Propose an implementation approach.
6. Identify the files that need modification or creation.
7. Implement incrementally.
8. Verify integration.
9. Report the completed work.

For significant architectural changes, present the proposed design and obtain approval before proceeding.

Avoid unnecessary planning overhead for small, straightforward changes.

# 4. Frontend Development

Follow professional frontend engineering practices.

## Architecture

- Keep components focused and reusable.
- Separate presentation from business logic where appropriate.
- Avoid unnecessarily large components.
- Maintain consistent component and file naming.
- Reuse existing design systems and shared components.
- Avoid duplicating functionality.

## UI Development

- Maintain consistent layouts, spacing, typography and visual hierarchy.
- Implement responsive interfaces.
- Support appropriate loading, empty, success and error states.
- Ensure forms provide meaningful validation and feedback.
- Avoid unnecessary visual or functional changes to unrelated components.

## State Management

- Use the existing state management approach.
- Keep state as close as practical to where it is needed.
- Avoid unnecessary global state.
- Handle asynchronous state transitions correctly.
- Prevent stale state and unintended side effects.

## Accessibility

- Use semantic HTML.
- Provide appropriate labels for form controls.
- Support keyboard navigation.
- Maintain meaningful focus states.
- Use accessible names for interactive elements.
- Avoid inaccessible interaction patterns.

# 5. Backend Development

Follow established backend engineering principles.

## Architecture

- Separate routing, business logic and data-access responsibilities.
- Keep controllers and route handlers manageable.
- Use reusable services where appropriate.
- Avoid tightly coupled modules.
- Maintain clear boundaries between application layers.

## API Development

- Follow consistent REST conventions where applicable.
- Use appropriate HTTP methods and status codes.
- Validate incoming requests.
- Return predictable response structures.
- Handle errors consistently.
- Avoid exposing internal implementation details.
- Maintain API compatibility unless breaking changes are authorized.

## Business Logic

- Keep business rules separate from transport-layer logic.
- Avoid duplicating business logic.
- Handle edge cases explicitly.
- Validate data at appropriate boundaries.
- Avoid trusting client-provided information without verification.

# 6. Database Engineering

Treat database changes as architectural changes when appropriate.

- Understand the existing schema before modifying it.
- Use appropriate primary and foreign keys.
- Maintain referential integrity.
- Choose suitable data types.
- Use indexes where justified.
- Avoid unnecessary queries and N+1 query patterns.
- Use transactions for operations requiring atomicity.
- Handle database errors appropriately.
- Avoid destructive schema changes without authorization.

## Migrations

- Use the project's established migration system.
- Keep schema changes version-controlled.
- Avoid manually modifying production databases.
- Preserve existing data.
- Consider rollback strategies.
- Review the impact of migrations before execution.

Never assume a database is disposable.

# 7. Authentication and Authorization

Security MUST be considered throughout development.

- Follow established authentication mechanisms.
- Enforce authorization on the server.
- Apply least-privilege access.
- Validate ownership and resource permissions.
- Protect session and token handling.
- Avoid storing sensitive credentials in frontend code.
- Never expose private environment variables.
- Use secure cookie configurations where applicable.
- Apply appropriate password-storage mechanisms.
- Avoid implementing custom cryptographic mechanisms.

Authentication does not automatically imply authorization.

# 8. Security Standards

Follow secure development practices.

- Validate and sanitize untrusted input.
- Prevent SQL injection.
- Prevent cross-site scripting (XSS).
- Consider cross-site request forgery (CSRF).
- Configure CORS appropriately.
- Avoid exposing stack traces and sensitive errors.
- Protect secrets and environment variables.
- Avoid insecure dependency installation.
- Use secure communication channels.
- Apply appropriate rate limiting where needed.
- Avoid insecure direct object references.
- Never hardcode credentials, tokens or private keys.

Do not weaken existing security controls to make an implementation work.

# 9. Error Handling and Logging

- Handle expected failures explicitly.
- Avoid silently swallowing errors.
- Use consistent error responses.
- Provide useful diagnostic information.
- Avoid exposing secrets or personal information in logs.
- Distinguish application errors from infrastructure failures.
- Preserve useful error context.
- Avoid excessive or redundant logging.

Errors should be actionable and understandable.

# 10. Code Quality and Maintainability

- Follow the existing formatting and naming conventions.
- Use meaningful variable and function names.
- Avoid unnecessary abstractions.
- Avoid duplicated logic.
- Keep functions and modules focused.
- Remove dead code when appropriate.
- Avoid unexplained magic values.
- Use types and interfaces where supported.
- Document complex logic when necessary.
- Avoid unnecessary comments that merely repeat the code.

Do not rewrite working code simply to impose personal preferences.

# 11. Dependencies and Package Management

- Prefer existing dependencies when they satisfy requirements.
- Inspect package compatibility before introducing dependencies.
- Avoid unnecessary packages.
- Avoid outdated or unmaintained dependencies.
- Do not upgrade unrelated packages without justification.
- Preserve the existing package manager and lockfile.
- Explain significant dependency additions.
- Never install suspicious packages without evaluating their source and purpose.

# 12. Performance and Scalability

Consider performance during implementation.

- Avoid unnecessary network requests.
- Avoid inefficient database access.
- Prevent unnecessary frontend re-renders.
- Use pagination for large datasets where appropriate.
- Avoid loading unnecessary resources.
- Consider caching when justified.
- Avoid premature optimization.
- Identify performance bottlenecks before introducing complex optimizations.

Build for the actual requirements rather than hypothetical scale.

# 13. Configuration and Environment Management

- Keep environment-specific configuration outside application source code.
- Use environment variables appropriately.
- Maintain an accurate environment variable example file.
- Never commit actual secrets.
- Distinguish development, staging and production configurations.
- Avoid modifying global machine configuration unnecessarily.
- Prefer project-local tooling and configuration.

Do not overwrite existing environment configuration without authorization.

# 14. Testing and Verification

Testing is a supporting engineering responsibility, not a substitute for implementation.

After development changes:

- Run relevant existing tests.
- Verify affected application functionality.
- Run appropriate build and type-check commands.
- Verify API and database integration where applicable.
- Check relevant error paths.
- Confirm that existing functionality has not been unintentionally broken.

Do not claim that something works merely because code was written.

If verification cannot be performed, clearly state what remains unverified.

Do not introduce an entirely new testing framework unless justified by the project requirements or explicitly requested.

# 15. Git and Version Control

- Respect the existing Git workflow.
- Inspect the working tree before making changes.
- Never discard unrelated user modifications.
- Avoid destructive Git commands without explicit authorization.
- Do not rewrite shared Git history without permission.
- Keep changes focused.
- Use meaningful commit messages when commits are requested.
- Never commit secrets, credentials or generated sensitive data.

Do not create commits, push changes or open pull requests unless requested or authorized.

# 16. Infrastructure and Deployment

- Understand the existing deployment architecture.
- Preserve existing infrastructure configuration.
- Avoid unnecessary infrastructure changes.
- Never deploy to production without explicit authorization.
- Never modify production resources without approval.
- Review environment-specific configuration.
- Consider rollback and recovery procedures.
- Avoid exposing internal infrastructure information.

Infrastructure modifications must be deliberate and traceable.

# 17. Agent Autonomy and Development Boundaries

Agents are authorized to inspect and modify project files necessary for the assigned development task, subject to the applicable safety protocol and tool permissions.

However, agents MUST NOT independently:

- Delete important project data.
- Perform destructive database operations.
- Deploy applications to production.
- Modify production infrastructure.
- Expose or transmit secrets.
- Change authentication or security policies.
- Purchase services or incur financial commitments.
- Push changes to remote repositories without authorization.
- Modify unrelated projects or files.

Request authorization before consequential or irreversible operations.

Do not interpret access to a tool as permission to perform every action available through that tool.

# 18. Completion Reporting

After completing a development task, provide a concise report containing:

**Implementation**
- What was implemented.
- How the implementation works.
- Important architectural decisions.

**Files**
- Files created.
- Files modified.
- Relevant configuration changes.

**Dependencies**
- New dependencies introduced, if any.

**Verification**
- Commands executed.
- Build or test results.
- Known limitations and unverified areas.

**Outstanding Work**
- Remaining issues.
- Required manual configuration.
- Follow-up work, if applicable.

Never fabricate successful execution, test results or deployment status.

# 19. Final Engineering Standard

Every implementation should satisfy the following priorities:

1. Correctness
2. Security
3. Maintainability
4. Reliability
5. Performance
6. Scalability
7. Simplicity

Do not sacrifice security or correctness for development speed.

Do not overengineer straightforward requirements.

Do not modify unrelated functionality.

**Final Principle: Understand the system, implement deliberately, preserve existing functionality, and verify every meaningful change.**

---

**End of Full-Stack Development Engineering Standards.**