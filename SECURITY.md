# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| latest  | ✅ Security updates |

Cockpit tracks the latest release on `main`. Older releases are not supported for security patches — upgrade to the current version.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.** Public disclosure before a fix gives attackers a window to exploit.

### Preferred path

1. Email **security@byjtt.com** with the subject `Cockpit Security: <brief description>`.
2. Include:
   - Description of the vulnerability
   - Steps to reproduce (or a proof of concept)
   - Impact assessment (what an attacker could achieve)
   - Your contact info for follow-up
3. Allow up to **72 hours** for an initial response. If you don't hear back, follow up.

### What happens after

- We confirm receipt and assess severity.
- We work on a fix in private (no public commits, no PRs).
- Once a fix is ready, we coordinate disclosure: release a patched version, then publish a brief advisory.
- We credit the reporter (unless you prefer to remain anonymous — say so in your report).

### What we don't do

- We do not offer a bug bounty or monetary reward for reports.
- We do not engage in public vulnerability disclosure before a fix is ready.
- We do not share reporter details publicly without permission.

### Scope

The security boundary covers:

- The Cockpit web application (SPA) served by the Hermes dashboard at `/`
- API endpoints exposed under `/api/*` and `/api/ws`
- Client-side session data, project storage, and repo context
- Dependency supply-chain issues in `package.json` (report via the same channel)

Out of scope (use the Hermes or upstream project contacts instead):

- Hermes Agent core (the underlying agent runtime) — report upstream via the Hermes project
- Vite, React, TypeScript, or other third-party framework bugs — report to those maintainers

### Disclosure window

We aim to acknowledge within 72 hours and to issue a patched release within a reasonable window depending on severity. Critical issues (remote code execution, authentication bypass, exposed secrets) get priority over lower-severity bugs (UI polish, non-sensitive info leaks).

### Hall of thanks

If you help us improve Cockpit's security and want public credit, we'll list you in the release notes. If you prefer anonymity, we'll say "a security researcher reported this."


