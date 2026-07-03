# Security Policy

## Overview

CinePro Core is built on top of the [@omss/framework](https://github.com/omss-spec/framework), which handles the core backend logic, routing, and security features. This repository primarily contains provider implementations and configuration.

> [!IMPORTANT]
> Security vulnerabilities should be reported to the appropriate project based on where the issue originates.

## Supported Versions

We support the latest version of CinePro Core with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

### Where to Report

Before reporting a security vulnerability, please determine where the issue originates:

#### 1. Framework-Level Vulnerabilities

If the vulnerability is related to:

- Core routing or API endpoints
- Proxy system implementation
- TMDB integration
- Cache system (Redis/Memory)
- Request/response handling
- OMSS specification compliance

**→ Report to [@omss/framework](https://github.com/omss-spec/framework/security/advisories/new)**

These issues are handled by the OMSS framework maintainers.

#### 2. Underlying Dependencies

If the vulnerability is in:

- **Fastify** (web framework): [Report to Fastify](https://github.com/fastify/fastify/security/advisories)
- **Node.js**: [Report to Node.js Security Team](https://nodejs.org/en/security/)
- **Other dependencies**: Check the respective project's security policy

#### 3. CinePro Core Specific Vulnerabilities

Report to CinePro Core if the vulnerability is specific to:

- Provider implementations in `src/providers/`
- Custom configuration or environment handling
- CinePro-specific code not part of the OMSS framework

**→ Report via GitHub Security Advisories**: [Create a Security Advisory](https://github.com/cinepro-org/core/security/advisories/new)

Alternatively, you can email security concerns directly to security@cinepro.cc

### What to Include in Your Report

When reporting a vulnerability, please include:

1. **Description**: Clear description of the vulnerability
2. **Impact**: What an attacker could achieve
3. **Affected Component**: Which part of the system is affected
4. **Steps to Reproduce**: Detailed steps to reproduce the issue
5. **Proof of Concept**: Code or requests demonstrating the vulnerability
6. **Suggested Fix**: If you have ideas on how to fix it (optional)
7. **Environment Details**:
    - CinePro Core version
    - @omss/framework version
    - Node.js version
    - Operating system

### Response Timeline

For vulnerabilities reported to CinePro Core:

- **Initial Response**: Within 48 hours
- **Triage**: Within 1 week
- **Fix Development**: Depends on severity (critical issues prioritized)
- **Public Disclosure**: After a fix is released and users have time to update

## Security Best Practices

When using CinePro Core:

### 1. Keep Dependencies Updated

Regularly update dependencies to get security patches:

```bash
npm update
npm audit
npm audit fix
```

### 2. Environment Configuration

- **Never commit `.env` files** to version control
- Use strong, unique values for sensitive configuration
- Keep `TMDB_API_KEY` secure and don't share it publicly
- If using Redis, use authentication (`REDIS_PASSWORD`)

### 3. Network Security

- **Use HTTPS** in production environments
- Configure proper CORS settings in production
- Consider rate limiting for public deployments
- Use a reverse proxy (nginx, Caddy) in front of the service

### 4. Provider Security

When developing providers:

- **Never expose API keys or secrets** in provider code
- Validate all external data before processing
- Use `this.createProxyUrl()` for all streaming URLs
- Implement proper error handling to avoid information leakage
- Be cautious with user-supplied TMDB IDs (already validated by framework)

### 5. Production Deployment

- Set `NODE_ENV=production` in production
- Use Redis for caching (not memory cache)
- Monitor logs for suspicious activity
- Implement access controls if exposing publicly
- Keep Node.js and system packages updated

## Known Security Considerations

### Personal Use Only

CinePro Core is designed for **personal and home use**. If you're exposing it publicly:

- Implement authentication/authorization
- Use rate limiting to prevent abuse
- Monitor usage and logs
- Be aware of legal implications in your jurisdiction

### Streaming Source Providers

Provider implementations scrape third-party websites. Be aware that:

- Third-party sites may contain malicious content
- Provider availability and safety can change
- Use at your own risk and comply with applicable laws
- The OMSS framework's proxy system provides some isolation

### Dependency Chain

Our dependencies include:

```json
{
    "@omss/framework": "^1.1.10", // Core backend logic
    "crypto-js": "^4.2.0", // Cryptographic utilities
    "dotenv": "^16.4.5" // Environment configuration
}
```

More dependencies could be added to cinepro-core. Please refer to `package.json` for the latest list.

Underlying framework dependencies (managed by @omss/framework):

- **Fastify**: Web framework with security features
- **Redis** (optional): Cache backend
- Additional utilities

Monitor security advisories for these dependencies.

## Security Audits

We rely on:

- **npm audit**: Regular dependency vulnerability scanning
- **GitHub Dependabot**: Automated security updates
- **OMSS Framework**: Security handled by framework maintainers
- **Community Reports**: Responsible disclosure from the community

## Disclosure Policy

- We follow **coordinated disclosure** practices
- Security issues are fixed before public disclosure
- Credit is given to security researchers (if desired)
- CVEs are requested for significant vulnerabilities

## Questions?

If you're unsure whether something is a security issue or where to report it:

1. Check if it's related to the OMSS framework or CinePro-specific code
2. Open a [discussion](https://github.com/orgs/cinepro-org/discussions) (for non-sensitive questions)
3. Contact maintainers privately via GitHub Security Advisories

## Legal

CinePro Core is provided "as is" without warranty. See the [PolyForm Noncommercial 1.0 License](../LICENSE) for details.

---

**Thank you for helping keep CinePro Core and its users safe! 🔒**
