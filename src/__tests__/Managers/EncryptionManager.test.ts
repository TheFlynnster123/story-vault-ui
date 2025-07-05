import { describe, it, expect } from "vitest";
import { EncryptionManager } from "../../Managers/EncryptionManager";

describe("EncryptionManager", () => {
  const testGuid = "test-encryption-guid-123";

  describe("constructor", () => {
    it("should initialize with encryption GUID", () => {
      const encryptionManager = new EncryptionManager(testGuid);
      expect(encryptionManager).toBeInstanceOf(EncryptionManager);
    });
  });

  describe("basic functionality", () => {
    it("should have required methods", () => {
      const encryptionManager = new EncryptionManager(testGuid);

      expect(typeof encryptionManager.initialize).toBe("function");
      expect(typeof encryptionManager.encryptString).toBe("function");
      expect(typeof encryptionManager.decryptString).toBe("function");
    });

    it("should throw error when using methods before initialization", async () => {
      const encryptionManager = new EncryptionManager(testGuid);

      await expect(
        encryptionManager.encryptString("key", "data")
      ).rejects.toThrow();

      await expect(
        encryptionManager.decryptString("key", "data")
      ).rejects.toThrow();
    });
  });

  // Note: Full crypto testing would require a more complex setup with proper Web Crypto API mocking
  // or integration tests. For now, we focus on basic structure and error handling.
  describe("error handling", () => {
    it("should handle initialization in environments without crypto", async () => {
      // Save original crypto
      const originalCrypto = global.crypto;

      // Remove crypto to simulate unsupported environment
      delete (global as any).crypto;

      const encryptionManager = new EncryptionManager(testGuid);

      await expect(encryptionManager.initialize()).rejects.toThrow();

      // Restore crypto
      global.crypto = originalCrypto;
    });
  });
});
