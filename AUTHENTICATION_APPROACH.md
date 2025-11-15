# Authentication & Encryption Approach for StoryVault

## Executive Summary

This document analyzes the current authentication and encryption architecture of StoryVault (UI + Azure Functions API) and proposes a refined, cost-effective approach using Azure services while maintaining end-to-end encryption (E2EE) with client-side key generation.

**Key Requirement:** The encryption key must remain unknown to the backend and the system administrator, ensuring true zero-knowledge encryption where only the user can decrypt their data.

---

## Current Architecture Analysis

### Authentication (Auth0)

**Current Setup:**
- **Provider:** Auth0 (Third-party SaaS)
- **Client:** `@auth0/auth0-react` SDK in UI
- **Backend Verification:** JWT validation via `jsonwebtoken` + `jwks-rsa`
- **Token Flow:** OAuth 2.0 / OpenID Connect
- **Custom Claims:** `https://story-vault-api.com/encryption_guid` stored in ID token

**What's Working Well:**
- ✅ Industry-standard OAuth 2.0/OIDC implementation
- ✅ Secure token-based authentication
- ✅ JWT verification with public key validation
- ✅ Support for custom claims in tokens

**Current Limitations:**
- 💰 **Cost:** Auth0 free tier limits (7,000 active users, after that $35/month minimum + $0.0350 per active user)
- 🔧 **Complexity:** External dependency for simple use case
- 🔐 **Custom Claims Management:** Requires Auth0 Actions/Rules for encryption_guid injection

### Encryption System

**Current Setup:**
- **Location:** Encryption happens client-side (browser)
- **Algorithm:** AES-GCM-256 with PBKDF2 key derivation
- **Key Generation:** Based on `encryption_guid` from Auth0 custom claim
- **Key Derivation:** PBKDF2 with 100,000 iterations, SHA-256, unique salt per service (grok, chat, civitai)
- **Storage:** Backend stores only ciphertext in Azure Blob Storage

**Key Flow:**
1. User authenticates with Auth0
2. Auth0 returns JWT with custom claim `encryption_guid` (likely a UUID)
3. Client retrieves `encryption_guid` from token
4. Client derives service-specific encryption keys using PBKDF2
5. Client encrypts sensitive data (API keys, chat messages)
6. Client sends ciphertext to Azure Functions API
7. API stores ciphertext in Azure Blob Storage

**What's Working Well:**
- ✅ Client-side encryption - backend never sees plaintext
- ✅ AES-GCM provides authenticated encryption
- ✅ Separate keys per service (defense in depth)
- ✅ Strong key derivation (PBKDF2 with 100k iterations)

**Current Issues:**
- ⚠️ **Key Management Problem:** `encryption_guid` must be stored somewhere - where is it initially created and stored?
- ⚠️ **Recovery Risk:** If user loses access, data is unrecoverable (this may be intentional)
- ⚠️ **PBKDF2 Source:** The `encryption_guid` appears to be the master secret, but its generation/storage is unclear
- ❌ **Administrator Access:** If the `encryption_guid` is stored in Auth0 custom claims, administrators with Auth0 access could potentially retrieve it and decrypt user data

---

## Refined Azure-Based Approach

### Goals
1. ✅ Reduce costs by replacing Auth0 with Azure services
2. ✅ Maintain true zero-knowledge encryption (admin cannot decrypt data)
3. ✅ Keep encryption keys client-side only
4. ✅ Backend stores only ciphertext
5. ✅ Provide secure, scalable authentication
6. ✅ Maintain good user experience

---

## Recommended Solution: Azure AD B2C + Client-Side Key Derivation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  1. User enters password during registration/login              │
│  2. Generate master encryption key from password (PBKDF2)       │
│  3. Derive service-specific keys (grok, chat, civitai)         │
│  4. Store master key encrypted with session in memory/storage   │
│  5. Encrypt sensitive data before sending to API                │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Encrypted Data + JWT)
┌─────────────────────────────────────────────────────────────────┐
│                  AZURE FUNCTIONS API (Backend)                   │
├─────────────────────────────────────────────────────────────────┤
│  1. Validate JWT from Azure AD B2C                              │
│  2. Extract user ID from token (sub claim)                      │
│  3. Store/retrieve only ciphertext                              │
│  4. Never sees plaintext or encryption keys                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (Ciphertext Only)
┌─────────────────────────────────────────────────────────────────┐
│                   AZURE BLOB STORAGE                             │
├─────────────────────────────────────────────────────────────────┤
│  • Stores only encrypted data                                   │
│  • Organized by user ID                                         │
│  • No encryption keys stored                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Authentication with Azure AD B2C

### Why Azure AD B2C?

**Cost Benefits:**
- 🆓 **First 50,000 MAU (Monthly Active Users) are FREE**
- 💰 After that: $0.00325 per MAU for stored users
- 💰 MFA: $0.03 per authentication (optional)
- 📊 **Comparison:** Auth0 charges $0.0350 per MAU after 7,000 free users (10x more expensive)

**Features:**
- ✅ Fully managed identity provider (Microsoft-hosted)
- ✅ OAuth 2.0 / OpenID Connect support
- ✅ Customizable user flows (sign-up, sign-in, password reset)
- ✅ JWT token issuance with custom claims
- ✅ Built-in integration with Azure Functions
- ✅ Social identity providers (optional)
- ✅ MFA support (optional)

### Implementation Changes Required

**Frontend (React):**
- Replace `@auth0/auth0-react` with `@azure/msal-react`
- Update configuration to point to Azure AD B2C tenant
- Minimal code changes - MSAL API is similar to Auth0

**Backend (Azure Functions):**
- Replace `jwks-rsa` JWT validation with Azure AD B2C JWKS endpoint
- Update JWT issuer and audience validation
- Extract user ID from `sub` or `oid` claim (standard OIDC claims)

**Cost Savings:**
- 50,000 users: **$0/month** (vs ~$1,750/month with Auth0)
- 100,000 users: **~$163/month** (vs ~$3,500/month with Auth0)

---

## Component 2: True Zero-Knowledge Encryption

### The Critical Problem with Current Approach

The current system has a fundamental flaw: **if `encryption_guid` is stored in Auth0 (or any backend), an administrator can potentially access it and decrypt user data.**

### Solution: Password-Based Key Derivation

**Core Principle:** The encryption key must be derived from something only the user knows (their password) and never transmitted or stored anywhere.

### Detailed Implementation

#### Step 1: Registration Flow

```typescript
// CLIENT-SIDE ONLY
async function registerUser(email: string, password: string) {
  // 1. Derive master encryption key from password
  const masterKey = await deriveMasterKeyFromPassword(email, password);
  
  // 2. Create user account in Azure AD B2C
  // NOTE: Azure AD B2C hashes the password using bcrypt (we never see plaintext)
  await azureB2C.signUp(email, password);
  
  // 3. Store master key in memory for current session
  sessionStorage.setItem('masterKey', masterKey);
  
  // 4. Derive service-specific keys
  await deriveServiceKeys(masterKey);
}

async function deriveMasterKeyFromPassword(
  email: string, 
  password: string
): Promise<string> {
  // Use email as salt (unique per user, not secret)
  const salt = new TextEncoder().encode(email.toLowerCase());
  
  // Import password as key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive a strong encryption key
  const masterKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000, // OWASP 2023 recommendation for PBKDF2-SHA256
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Export as hex string for storage
  const exportedKey = await crypto.subtle.exportKey('raw', masterKey);
  return Array.from(new Uint8Array(exportedKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

#### Step 2: Login Flow

```typescript
// CLIENT-SIDE ONLY
async function loginUser(email: string, password: string) {
  // 1. Authenticate with Azure AD B2C
  const token = await azureB2C.signIn(email, password);
  
  // 2. Re-derive master encryption key from password
  const masterKey = await deriveMasterKeyFromPassword(email, password);
  
  // 3. Store in session memory (cleared on logout/tab close)
  sessionStorage.setItem('masterKey', masterKey);
  
  // 4. Derive service-specific keys
  await deriveServiceKeys(masterKey);
  
  return token;
}
```

#### Step 3: Service-Specific Key Derivation

```typescript
// CLIENT-SIDE ONLY
async function deriveServiceKeys(masterKeyHex: string) {
  const encryptionManager = new EncryptionManager();
  
  // Store master key hex as the "encryption guid"
  encryptionManager.encryptionGuid = masterKeyHex;
  
  // Derive service-specific keys (same as current implementation)
  encryptionManager.grokEncryptionKey = await encryptionManager.deriveKey('grok');
  encryptionManager.chatEncryptionKey = await encryptionManager.deriveKey('chat');
  encryptionManager.civitaiEncryptionKey = await encryptionManager.deriveKey('civitai');
}
```

### Key Security Properties

**What This Achieves:**
- ✅ **Zero-Knowledge:** Encryption key derived from password, never leaves client
- ✅ **No Backend Storage:** Master key exists only in browser memory during session
- ✅ **Admin-Proof:** System administrator cannot decrypt data (doesn't have password)
- ✅ **Unique Per User:** Email used as salt ensures unique keys per user
- ✅ **Standards-Compliant:** PBKDF2 with 600k iterations (OWASP 2023 recommendation)

**Important Trade-offs:**
- ⚠️ **No Recovery:** If user forgets password, data is permanently lost
- ⚠️ **Password Changes:** Requires re-encrypting all data with new key
- ⚠️ **Session-Based:** Key only exists during active session

---

## Component 3: Optional - Key Backup with User-Controlled Recovery

If you want to provide a recovery mechanism while maintaining security:

### Option A: Recovery Key (Recommended)

```typescript
// During registration, generate a recovery key
async function registerWithRecovery(email: string, password: string) {
  const masterKey = await deriveMasterKeyFromPassword(email, password);
  
  // Generate a human-readable recovery key (24 words, BIP39 style)
  const recoveryKey = generateRecoveryKey();
  
  // Encrypt master key with recovery key
  const encryptedMasterKey = await encryptWithRecoveryKey(masterKey, recoveryKey);
  
  // Store encrypted master key in backend (safe because recovery key is user-only)
  await storeEncryptedMasterKey(userId, encryptedMasterKey);
  
  // Display recovery key to user (MUST be saved offline)
  displayRecoveryKeyToUser(recoveryKey);
}
```

**User Experience:**
- User shown recovery key during registration
- Must write down or save in password manager
- Can use recovery key to decrypt master key if password forgotten
- Backend stores encrypted master key, but cannot decrypt without recovery key

### Option B: Multi-Factor Recovery

Use Azure AD B2C's built-in password reset with a re-encryption flow:
1. User resets password via email
2. System prompts for old data to be re-encrypted or marked as lost
3. New master key derived from new password
4. Future data encrypted with new key

---

## Component 4: Backend Changes

### Minimal Changes to Azure Functions API

The backend remains largely unchanged:

```typescript
// src/utils/getAuthenticatedUserId.ts
export const getAuthenticatedUserId = async (
  request: HttpRequest
): Promise<string> => {
  const authHeader = request.headers.get("authorization") || "";
  
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or malformed Authorization header");
  }
  
  const token = authHeader.split(" ")[1];
  
  // Validate JWT from Azure AD B2C
  const decoded = jwt.decode(token, { complete: true });
  
  // Use Azure AD B2C JWKS endpoint
  const client = jwksRsa({
    jwksUri: `https://{tenant}.b2clogin.com/{tenant}.onmicrosoft.com/{policy}/discovery/v2.0/keys`
  });
  
  const key = await client.getSigningKey(decoded.header.kid);
  const signingKey = key.getPublicKey();
  
  const verified = jwt.verify(token, signingKey, {
    algorithms: ['RS256'],
    issuer: `https://{tenant}.b2clogin.com/{tenant-id}/v2.0/`
  });
  
  // Extract user ID from standard OIDC claim
  const userId = verified.sub || verified.oid;
  
  if (!userId) {
    throw new Error("Missing user ID in token");
  }
  
  return userId;
}
```

**No Changes Needed:**
- Blob storage layer (still stores only ciphertext)
- Encryption/decryption logic (still client-side only)
- API endpoints (still receive/return ciphertext)

---

## Implementation Roadmap

### Phase 1: Azure AD B2C Setup (1-2 days)
1. Create Azure AD B2C tenant
2. Configure user flows (sign-up, sign-in, password reset)
3. Register application in B2C
4. Configure JWT token settings
5. Test authentication flow

### Phase 2: Frontend Migration (2-3 days)
1. Replace `@auth0/auth0-react` with `@azure/msal-react`
2. Update `Config.ts` with Azure AD B2C settings
3. Implement password-based key derivation
4. Update `EncryptionManager` to use derived keys
5. Test encryption/decryption flows
6. Update session management

### Phase 3: Backend Migration (1 day)
1. Update JWT validation to use Azure AD B2C JWKS
2. Update user ID extraction from tokens
3. Test with new tokens
4. Update environment variables

### Phase 4: Recovery Mechanism (Optional, 2-3 days)
1. Implement recovery key generation
2. Add encrypted key storage API endpoint
3. Build recovery UI flow
4. Test recovery process

### Phase 5: Testing & Migration (2-3 days)
1. Comprehensive end-to-end testing
2. Security audit
3. Performance testing
4. Data migration planning (if needed)
5. Deploy to staging environment

**Total Estimated Time:** 8-14 days

---

## Cost Comparison

### Current (Auth0) Costs

| Users | Auth0 Cost/Month | Notes |
|-------|------------------|-------|
| 0-7,000 | $0 | Free tier |
| 10,000 | ~$105 | $35 base + ($0.035 × 3,000) |
| 50,000 | ~$1,540 | $35 base + ($0.035 × 49,000) |
| 100,000 | ~$3,290 | $35 base + ($0.035 × 99,000) |

### Proposed (Azure AD B2C) Costs

| Users | Azure AD B2C Cost/Month | Notes |
|-------|-------------------------|-------|
| 0-50,000 | $0 | Free tier |
| 100,000 | ~$163 | $0.00325 × 50,000 additional |
| 500,000 | ~$1,463 | $0.00325 × 450,000 additional |

**Annual Savings:**
- 10,000 users: ~$1,260/year
- 50,000 users: ~$18,480/year
- 100,000 users: ~$37,524/year

---

## Security Analysis

### Threat Model

| Threat | Current System | Proposed System |
|--------|---------------|-----------------|
| **Backend Compromise** | ⚠️ Ciphertext exposed | ✅ Ciphertext exposed (same) |
| **Database Breach** | ⚠️ Ciphertext exposed | ✅ Ciphertext exposed (same) |
| **Admin Access** | ❌ Can retrieve encryption_guid | ✅ Cannot derive key without password |
| **Man-in-the-Middle** | ✅ TLS encrypted | ✅ TLS encrypted (same) |
| **Password Compromise** | ❌ Not applicable | ⚠️ All data decryptable |
| **Auth Provider Breach** | ❌ encryption_guid exposed | ✅ Only auth data, not encryption key |
| **Client Malware** | ⚠️ Can steal keys from memory | ⚠️ Can steal keys from memory (same) |

### Security Improvements

1. ✅ **True Zero-Knowledge:** Even Azure/Microsoft admins cannot decrypt data
2. ✅ **Reduced Attack Surface:** No encryption_guid stored in authentication system
3. ✅ **Principle of Least Privilege:** Backend has no access to encryption keys
4. ✅ **Defense in Depth:** Password and encryption decoupled from auth provider

### Security Considerations

1. ⚠️ **Password Strength Critical:** Weak passwords = weak encryption
   - **Mitigation:** Enforce strong password policy in Azure AD B2C
   - **Recommendation:** Minimum 12 characters, complexity requirements

2. ⚠️ **No Account Recovery:** Forgotten password = data loss
   - **Mitigation:** Implement optional recovery key system
   - **Mitigation:** Clear user education during registration

3. ⚠️ **Password Change Complexity:** Requires re-encryption
   - **Mitigation:** Implement background re-encryption job
   - **Alternative:** Store password-wrapped recovery key, allow re-wrap

4. ⚠️ **Browser Storage Security:** Master key in sessionStorage
   - **Mitigation:** Use sessionStorage (cleared on tab close)
   - **Mitigation:** Clear keys immediately on logout
   - **Alternative:** Keep only in memory, never persist

---

## Alternative Approaches Considered

### Alternative 1: Azure Key Vault for User Keys
**Concept:** Store encryption keys in Azure Key Vault per user

**Pros:**
- Managed key storage
- HSM backing available
- Access policies

**Cons:**
- ❌ Administrator can still access keys (doesn't meet zero-knowledge requirement)
- ❌ Cost: ~$0.03 per 10,000 operations
- ❌ Latency: Additional network call for each encryption operation
- ❌ Complexity: Key rotation, access management

**Verdict:** Rejected - violates zero-knowledge requirement

### Alternative 2: Hybrid Approach (Key Wrapping)
**Concept:** Store encrypted master key in backend, decrypt with password-derived key

**Pros:**
- Allows password changes without re-encryption
- Can implement social recovery
- Backend can store metadata

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Additional encryption layer
- ⚠️ Risk if KEK (Key Encryption Key) is weak

**Verdict:** Could be implemented as Phase 4 enhancement

### Alternative 3: Web3/Blockchain Wallet Authentication
**Concept:** Use MetaMask or similar wallet for auth + encryption

**Pros:**
- True zero-knowledge by design
- No password to remember
- Crypto-native users familiar with it

**Cons:**
- ❌ Poor UX for non-crypto users
- ❌ Wallet recovery still an issue
- ❌ Requires browser extension
- ❌ High barrier to entry

**Verdict:** Rejected - too niche for general audience

---

## Recommendations

### Immediate Action Items

1. **Setup Azure AD B2C** (High Priority)
   - Create tenant
   - Configure basic user flows
   - Estimate actual costs for expected user base

2. **Prototype Password-Based Key Derivation** (High Priority)
   - Build proof-of-concept in separate branch
   - Test encryption/decryption performance
   - Validate security assumptions

3. **Design Recovery Strategy** (Medium Priority)
   - Decide on recovery key approach vs. data loss acceptance
   - Design UX for recovery key storage
   - Create user education materials

4. **Migration Planning** (Medium Priority)
   - Determine if existing users need migration
   - Design migration flow if encryption_guid is currently used
   - Plan for downtime/maintenance window

### Long-Term Considerations

1. **Password Change Flow**
   - Build efficient re-encryption mechanism
   - Consider background job for large datasets
   - Provide progress indicator to user

2. **Cross-Device Sync**
   - If user logs in on multiple devices, each derives same key
   - Works automatically with proposed system
   - Consider warning user about browser storage

3. **Compliance & Legal**
   - Document zero-knowledge architecture for privacy compliance
   - Ensure GDPR compliance (data deletion, export)
   - Consider right-to-be-forgotten implications

4. **User Education**
   - Clear warnings about password loss = data loss
   - Recovery key importance
   - Password strength requirements

---

## Conclusion

**Recommended Approach:** Azure AD B2C + Password-Based Key Derivation

**Key Benefits:**
- 💰 **Significant Cost Savings:** Free for first 50K users, then ~10x cheaper than Auth0
- 🔐 **True Zero-Knowledge:** Even system administrators cannot decrypt user data
- ✅ **Standards-Based:** Uses proven cryptographic primitives (PBKDF2, AES-GCM)
- 🚀 **Scalable:** Azure AD B2C is enterprise-grade, globally distributed
- 🔧 **Simple Backend:** Minimal changes to existing Azure Functions API

**Key Trade-offs:**
- ⚠️ Password security is critical (mitigated with strong password policy)
- ⚠️ No built-in recovery (mitigated with optional recovery key system)
- ⚠️ Password changes require re-encryption (can be automated)

**Implementation Effort:** 8-14 days for full migration including testing

**Cost Savings:** 
- Year 1 (10K users): ~$1,260 saved
- Year 1 (100K users): ~$37,524 saved

This approach provides the best balance of cost, security, and user experience while fully meeting the requirement that "the Encryption Key should be generated client-side, with a key that is unknown to the backend."

---

## Questions for Stakeholder Decision

Before proceeding with implementation, please confirm:

1. **Recovery Policy:** Are you comfortable with "forgotten password = data loss" or do you want a recovery mechanism?

2. **Migration:** Do you have existing Auth0 users that need migration, or is this for a new deployment?

3. **Timeline:** Is the 8-14 day implementation timeline acceptable?

4. **User Experience:** Are users willing to use strong passwords (requirement for security)?

5. **Compliance:** Are there any specific compliance requirements (HIPAA, SOC2, etc.) we need to consider?

6. **Monitoring:** Do you want analytics/logging on authentication events (Azure AD B2C provides this)?

---

*Document Version: 1.0*  
*Last Updated: 2025-11-15*  
*Author: GitHub Copilot Agent*
