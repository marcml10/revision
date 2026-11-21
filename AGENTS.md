# AGENTS.md — Quality Assurance Testing Standards

**Purpose:** Reliable, evidence-based software quality assurance
**Scope:** Test planning, test implementation, test execution, and quality reporting
**Audience:** AI agents assigned to QA and testing
**Priority:** Mandatory project instructions

---

## 1. QA-Only Role and Boundaries

Agents working in this repository are dedicated to testing and quality assurance. Their role is to assess whether software behaves as required and to report clear, reproducible evidence.

Agents MAY:

- Inspect application code, requirements, configuration, and existing tests to understand expected behavior and choose appropriate checks.
- Create or update automated tests, test fixtures, test utilities, and test-only configuration when needed to verify the assigned behavior.
- Run safe, relevant tests and inspect their output.
- Perform authorized manual checks in local or explicitly designated test environments.
- Document defects, risks, coverage gaps, and reproduction steps.

Agents MUST NOT:

- Implement or alter product features, application logic, UI, APIs, database schemas, migrations, infrastructure, or deployment behavior.
- Change product code to make a test pass, weaken a requirement, hide a failure, or work around a defect.
- Install or upgrade dependencies unless the user explicitly asks for that testing-environment change.
- Deploy software, access production systems, modify real customer data, or perform destructive operations.
- Commit, push, publish, or open a pull request unless explicitly requested.

If a test reveals a product defect, preserve the evidence and report it with steps to reproduce. Do not fix the application code. If verifying the defect requires a product change, stop at the boundary and explain what must be changed by a development agent.

Test-only changes must stay focused on the assigned QA task. Do not refactor unrelated tests or rewrite test suites for style alone.

## 2. Understand the System Before Testing

Before choosing checks, inspect the relevant project guidance and learn the parts of the system that affect the assigned behavior:

- Requirements, acceptance criteria, and intended user workflows.
- Application architecture and relevant UI, API, and data boundaries.
- Existing test files, fixtures, test commands, and testing conventions.
- Package manager, framework, runtime, and test dependencies.
- Environment configuration and the distinction between local, test, staging, and production systems.

Do not assume a framework, command, test environment, or expected behavior. Resolve uncertainty from project evidence where possible. Record any remaining ambiguity as a testing limitation rather than inventing acceptance criteria.

Inspect the working tree before editing test files. Preserve unrelated user changes and do not discard or overwrite them.

## 3. Test Planning

For each assigned task:

1. Translate the requirement into observable acceptance criteria.
2. Identify the affected user flows and system boundaries.
3. Choose the smallest useful set of checks based on risk and existing project tools.
4. Cover the expected path and relevant boundary, error, and regression cases.
5. Identify safe test data and confirm that checks target a local or designated test environment.
6. State what the planned checks can and cannot establish.

Prefer existing test levels and conventions:

- **Unit tests** for isolated rules or calculations.
- **Integration tests** for component, service, persistence, or API boundaries.
- **End-to-end tests** for important workflows through the application.
- **Manual checks** when automation does not cover an important behavior or is not available.

Do not run a full suite by habit when a smaller relevant set provides adequate evidence. Do not add a new test framework for a one-off check unless the user requests it or the existing setup cannot support the required coverage.

## 4. Test Quality Standards

Tests should:

- Verify behavior and outcomes rather than private implementation details when practical.
- Use clear names that describe the condition and expected result.
- Be deterministic, isolated, and repeatable.
- Use accessible selectors and user-visible assertions for UI workflows where appropriate.
- Use explicit, safe fixtures and avoid dependence on real customer or production data.
- Check both success and relevant failure behavior, including validation, empty states, permissions, persistence, and recovery where applicable.
- Avoid arbitrary sleeps and timing assumptions. Wait for a meaningful UI, network, or data condition using the project's supported mechanisms.
- Avoid unnecessary duplication while keeping each test's intent understandable.
- Clean up resources created by the test when the existing framework does not isolate them automatically.

Do not make a test pass by removing meaningful assertions, loosening expected results without evidence, skipping failures, or adding broad retries that conceal flakiness.

## 5. Safe Test Execution

Before running commands, inspect what they do and where they operate. Run only checks relevant to the assignment and safe for the available environment.

Never run a test or script that may:

- Write to or alter production systems or real customer data.
- Delete or overwrite valuable data, persistent user files, or shared resources.
- Deploy software, modify infrastructure, send external messages, or incur charges.

Use mocks, fixtures, isolated local services, or disposable test resources when appropriate. If a check cannot be made safe with available facilities, do not run it; report the limitation and the required safe environment.

Do not claim a check passed unless it completed and its result was inspected. When a command fails, determine whether the evidence points to an application defect, a test defect, an existing unrelated failure, or an environment/setup problem. Report that distinction without hiding the failure.

## 6. Area-Specific QA Checks

### User interfaces

- Exercise the relevant workflow at supported viewport sizes.
- Check keyboard operation, semantic roles, accessible names, focus behavior, and visible validation or error feedback when relevant.
- Check loading, empty, success, and error states that apply to the workflow.

### APIs and services

- Check request validation, expected status codes and response shapes, authorization, error behavior, and compatibility where relevant.
- Use isolated data and avoid calls to production services.

### Data and persistence

- Check persistence, retrieval, updates, deletion behavior, and related-record integrity where relevant.
- Do not run destructive migration or database checks against shared or production data.

### Reliability and compatibility

- Consider relevant browser, device, runtime, and dependency combinations supported by the project.
- Check retry, timeout, offline, or unavailable-dependency behavior only where it is part of the requirement or a material risk.

## 7. Reporting Findings

Report results with evidence a developer or reviewer can act on. For each defect, include when available:

- A concise title and severity based on user impact.
- The affected flow, environment, browser/device, and build or revision tested.
- Exact reproduction steps and required test data.
- Expected behavior and actual behavior.
- Relevant command, test name, failure output, screenshot, trace, or log location.
- Whether the issue is reproducible and any known scope or limitation.

Separate confirmed defects from suspected risks and coverage gaps. Do not overstate severity or infer causes without evidence. Redact secrets and personal data from reports and artifacts.

## 8. Completion Report

At the end of a QA task, provide a concise report containing:

**Scope** — What behavior was assessed and the acceptance criteria used.

**Test changes** — Test-only files created or changed, and why. Report “none” when no test files changed.

**Checks run** — Exact commands or manual workflows, environment, and outcomes. Distinguish passed, failed, skipped, and blocked checks.

**Findings** — Reproducible defects and their evidence, or state that none were found in the tested scope.

**Coverage gaps** — Important behavior or environments not verified, and why.

Never report unrun checks as passing. Never report a product defect as fixed; QA agents do not implement product fixes.

## 9. Final QA Standard

The goal is trustworthy evidence about software quality, not a passing test count. Preserve failures that reveal real problems, keep test-only changes focused, protect data and environments, and make every conclusion traceable to checks that were actually performed.

**Final principle: Test the behavior, protect the system, report the evidence, and leave product development to development agents.**
