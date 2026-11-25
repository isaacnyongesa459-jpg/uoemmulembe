# Platform readiness and security boundary

## Current deployment boundary

The public site is a static HTML/CSS/JavaScript application. GitHub Pages serves public files; it does not provide a trusted application server, private database, confidential storage, SMS gateway, secret management, access control, server sessions or a secure ballot box. Consequently, this repository does **not** implement or claim member sign-in, self-service registration, member records, password reset, OTP, administration, financial approvals, welfare applications, member-only document access or voting.

Do not add member credentials, phone numbers, student registration numbers, welfare details, individual votes, API keys or private reports to this public repository. Do not implement authentication or voting solely in browser JavaScript/local storage. The portal remains informational until a separately secured backend is designed, approved and deployed.

## Suggested service boundary

Before enabling private features, provision a maintained HTTPS application/API and managed relational database with encrypted backups, server-side secret management, monitoring and a private object-storage bucket. The browser should receive only public union information or the current authenticated member's explicitly authorized data through the API. Never expose a database service-role/admin key in frontend code or GitHub Pages configuration that is delivered to browsers.

A PostgreSQL-class data model can grow into these separate domains:

- `members`: opaque UUID, official university registration number (unique and protected), phone number, full name, county, subtribe, course, year, membership/account status, approval and timestamps. Minimize collection; never publish the directory by default.
- `credentials`: member UUID, password hash, reset-required flag, and timestamps. Use a modern adaptive password hash (Argon2id or a reviewed equivalent), never plaintext or reversible encryption. Enforce changing the temporary onboarding password at first sign-in. Treat the registration-number middle digits only as a one-time temporary credential; securely provision it server-side, force a reset and never display/store the derivation in browser code.
- `roles` / `member_roles`: constrained role assignments with least privilege and effective dates. Verify permissions on every API request; an unlinked admin page is not authorization.
- `otp_challenges`: member reference, purpose, OTP digest, expiry, attempt count, consumed timestamp and delivery metadata. Generate and verify only on the server; rate-limit by account and network; use a vetted SMS provider through server-only secrets. Avoid revealing whether an account or phone number exists.
- `events`, `announcements`, `documents`: review/publish/archive states, publication metadata and access classification. Keep restricted documents in private storage with short-lived authorized download links.
- `financial_entries`, `financial_approvals`, `audit_events`: proposed/actual status as separate fields, amount/currency, category, reference/evidence, recording and approval identities, approval state, and append-only audit history. Only approved actuals feed an actual ledger. Preserve the proposal as a separately sourced budget, and never infer cash-in-bank from planned income less planned allocations.
- `welfare_cases`: separate, tightly restricted records for sensitive requests. Limit access to explicitly authorized case handlers, log access, define retention/deletion rules, and do not expose medical details to general members or logs.
- `elections`, `candidates`, `eligibility`, `voting_credentials`, `ballots`, `published_results`: independently reviewed election configuration, eligibility, open/close times, duplicate-vote prevention and publication authorization. Keep voter identity verification separate from ballot contents. A production design needs a security and election-governance review for unlinkability, coercion resistance, auditability, access controls and verifiable tallying; ordinary application permissions alone do not guarantee ballot secrecy.

Use database constraints, migrations, least-privilege service identities, validated inputs, CSRF protection when cookie sessions are used, secure/HttpOnly/SameSite cookies, TLS, session expiry/revocation, generic login errors, rate limiting, security headers, audit monitoring and tested backup/restore. Define data retention, consent and an incident-response process before importing records.

## Required stages before real launch

1. Obtain union approval for data fields, membership rules, role matrix, election procedure, financial approval flow and privacy notices.
2. Select and secure the backend, database, SMS provider, private document storage and production domain; keep all provider credentials outside source control.
3. Implement migrations/API authorization, import validation, admin access recovery, audit logs, rate limits and private-file controls.
4. Run independent security testing and member/official acceptance tests with synthetic data; verify backups and incident handling.
5. Add the actual approved documents, leadership/contact details and official event/finance content with provenance and publication approval.
6. Only then enable sign-in, member records, OTP, welfare submissions or voting. Until then, keep these routes disabled and continue using the explicit status messages on the public site.

This document is an implementation boundary and design checklist, **not a deployed backend or a claim of production security**.
