# Authentication Approach - Quick Summary

**Full Documentation:** See [AUTHENTICATION_APPROACH.md](../AUTHENTICATION_APPROACH.md) in the root directory

## TL;DR

We analyzed the current Auth0 + client-side encryption setup and propose migrating to **Azure AD B2C with password-based key derivation** to achieve:

- 💰 **Massive Cost Savings:** Free for first 50K users (vs Auth0's 7K free tier), then ~10x cheaper
- 🔐 **True Zero-Knowledge:** Encryption keys derived from user password - **never stored anywhere**, even admins can't decrypt
- ✅ **Meets All Requirements:** Backend stores only ciphertext, encryption keys unknown to backend

## Current Issues

1. **Cost:** Auth0 charges $0.035 per user after 7K free users
2. **Security Gap:** `encryption_guid` in Auth0 custom claims means admins could potentially decrypt data
3. **Complexity:** External auth dependency for relatively simple use case

## Recommended Solution

### Authentication: Azure AD B2C
- Replace Auth0 with Azure AD B2C
- 50,000 MAU free (vs 7,000 with Auth0)
- After that: $0.00325/user (vs $0.035/user)
- OAuth 2.0 / OIDC standard (similar to Auth0)

### Encryption: Password-Based Key Derivation
```
User Password → PBKDF2 (600k iterations) → Master Key → Service Keys
              ↑ Never leaves browser      ↑ Only in memory
```

**Key Security Property:** Even if the entire backend is compromised, data remains encrypted because keys are never transmitted or stored.

## Cost Savings

| Users | Current (Auth0) | Proposed (Azure AD B2C) | Annual Savings |
|-------|----------------|------------------------|----------------|
| 10K   | $105/mo        | $0/mo                  | $1,260         |
| 50K   | $1,540/mo      | $0/mo                  | $18,480        |
| 100K  | $3,290/mo      | $163/mo                | $37,524        |

## Trade-offs

### ✅ Pros
- True zero-knowledge (admin-proof encryption)
- Significant cost savings
- Standards-based cryptography
- Minimal backend changes

### ⚠️ Cons
- Forgotten password = data loss (can mitigate with optional recovery key)
- Password changes require re-encryption
- Password strength is critical

## Implementation Timeline

**8-14 days total:**
1. Azure AD B2C setup (1-2 days)
2. Frontend migration (2-3 days)
3. Backend migration (1 day)
4. Optional recovery mechanism (2-3 days)
5. Testing & migration (2-3 days)

## Next Steps

1. Review full [AUTHENTICATION_APPROACH.md](../AUTHENTICATION_APPROACH.md)
2. Answer stakeholder questions (end of document)
3. Approve approach
4. Begin implementation

---

*For detailed technical specifications, security analysis, code examples, and alternative approaches, see the full document.*
