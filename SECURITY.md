# Security Policy

## 🛡️ Supported Versions

We actively support the following versions of Discord Calendar Bot:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Active support |
| < 1.0   | ❌ Beta versions - upgrade recommended |

## 🔒 Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### For Critical Security Issues
1. **DO NOT** open a public issue
2. Email the project maintainers directly
3. Include detailed information about the vulnerability
4. Allow reasonable time for investigation and fix

### For Non-Critical Issues
- Open a private security advisory on GitHub
- Or create an issue with the `security` label

## 🎯 Security Scope

### In Scope
- Authentication bypass
- Data exposure vulnerabilities  
- Injection attacks (command injection, etc.)
- Privilege escalation
- Discord token exposure
- GAS endpoint vulnerabilities

### Out of Scope
- Social engineering attacks
- Physical access vulnerabilities
- Third-party service vulnerabilities (Discord API, Google Calendar API)
- DoS attacks on free-tier services

## 🔧 Security Best Practices

When using Discord Calendar Bot:

### Environment Security
- ✅ Use strong, unique API keys
- ✅ Regularly rotate Discord bot tokens
- ✅ Never commit `.env` files to version control
- ✅ Use Railway environment variables for production

### Discord Security
- ✅ Grant minimal bot permissions
- ✅ Use guild-specific deployments when possible
- ✅ Monitor bot activity logs

### Google Calendar Security
- ✅ Use dedicated Google account for bot
- ✅ Limit calendar access scope
- ✅ Regularly review GAS permissions

## 📊 Security Updates

- Security patches are released as soon as possible
- Critical vulnerabilities get immediate patch releases
- Security advisories are published on GitHub
- Users are notified through repository releases

## 🤝 Acknowledgments

We appreciate security researchers who help keep Discord Calendar Bot safe:
- Report vulnerabilities responsibly
- Allow reasonable disclosure time
- Work with us to verify and fix issues

## 📞 Contact

For security concerns:
- Create a private security advisory on GitHub
- Reference this security policy in your report
- Include reproduction steps and impact assessment