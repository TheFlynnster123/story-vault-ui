import { beforeEach, describe, expect, it, vi } from "vitest";
import { d } from "../Dependencies";
import { EncryptionManager } from "./EncryptionManager";

vi.mock("../Dependencies");

type EncryptionManagerInternals = {
  deriveKey(encryptionGuid: string, salt: string): Promise<string>;
};

describe("EncryptionManager", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shares initialization across concurrent callers", async () => {
    const derivation = createDeferred<void>();
    const getEncryptionGuid = mockEncryptionGuid("encryption-guid");
    const manager = new EncryptionManager();
    const deriveKey = vi
      .spyOn(manager as unknown as EncryptionManagerInternals, "deriveKey")
      .mockImplementation(async (...args: unknown[]) => {
        const salt = args[1];
        if (typeof salt !== "string") throw new Error("Expected a string salt");

        await derivation.promise;
        return `${salt}-key`;
      });

    const firstKey = manager.getChatEncryptionKey();
    await vi.waitFor(() => expect(deriveKey).toHaveBeenCalled());

    const secondKey = manager.getChatEncryptionKey();
    let secondCallSettled = false;
    void secondKey.finally(() => {
      secondCallSettled = true;
    });
    await Promise.resolve();

    expect(secondCallSettled).toBe(false);

    derivation.resolve();

    await expect(Promise.all([firstKey, secondKey])).resolves.toEqual([
      "chat-key",
      "chat-key",
    ]);
    expect(getEncryptionGuid).toHaveBeenCalledOnce();
    expect(deriveKey).toHaveBeenCalledTimes(3);
  });

  it("fails clearly when the encryption GUID is unavailable", async () => {
    const getEncryptionGuid = mockEncryptionGuid(undefined);
    const manager = new EncryptionManager();
    const deriveKey = vi.spyOn(
      manager as unknown as EncryptionManagerInternals,
      "deriveKey",
    );

    await expect(manager.getChatEncryptionKey()).rejects.toThrow(
      "Encryption GUID is unavailable",
    );
    expect(getEncryptionGuid).toHaveBeenCalledOnce();
    expect(deriveKey).not.toHaveBeenCalled();
  });
});

function mockEncryptionGuid(encryptionGuid: string | undefined) {
  const getEncryptionGuid = vi.fn().mockResolvedValue(encryptionGuid);
  vi.mocked(d.AuthAPI).mockReturnValue({
    getEncryptionGuid,
  } as unknown as ReturnType<typeof d.AuthAPI>);
  return getEncryptionGuid;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
