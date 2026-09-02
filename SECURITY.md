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

### Scope

- **In scope:** Remote code execution, auth bypass, privilege escalation, data exfiltration, and other issues that let an attacker compromise a user's Hermes session or the served dashboard.
- **Out of scope:** Vulnerabilities in the upstream Hermes Agent itself (report those to the Hermes project), self-XSS with no session impact, theoretical issues with no reproducible exploit path.

### Hall of fame

Reporters whose responsible disclosures lead to a patched release are listed here (with permission). Start empty — the first entry earns its place.
