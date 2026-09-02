import { beforeEach, describe, expect, it, vi } from "vitest";

// cockpitStore talks to the backend only through hermesApi's
// readJsonFile/writeJsonFile. Mock the transport: these tests exercise the
// store logic (merge, assign, guards), not the HTTP layer.
const readJsonFile = vi.fn();
const writeJsonFile = vi.fn();

vi.mock("@/lib/hermesApi", () => ({
  readJsonFile: (...args: unknown[]) => readJsonFile(...args),
  writeJsonFile: (...args: unknown[]) => writeJsonFile(...args),
}));

import { CockpitStore, RepoStore } from "@/lib/cockpitStore";

beforeEach(() => {
  readJsonFile.mockReset();
  writeJsonFile.mockReset();
  readJsonFile.mockResolvedValue([]); // default: no saved folders (fresh install)
});

describe("CockpitStore.mergeFolders", () => {
  it("keeps system default folders and overlays saved user folders", async () => {
    const store = new CockpitStore();
    readJsonFile.mockResolvedValue([
      {
        id: "byjtt",
        name: "Renamed brand folder",
        order: 0,
        sessionIds: ["s1"],
      },
      { id: "custom", name: "My folder", order: 3, sessionIds: ["s2"] },
      // stale/old-shape payload entries must be ignored
      { name: "no id" },
      null,
    ] as any);
    await store.load();

    const ids = store.getFolders().map((f) => f.id);
    // System defaults survive even if the saved payload lost them.
    expect(ids).toContain("byjtt");
    expect(ids).toContain("jordan");
    expect(ids).toContain("toolkit");
    expect(ids).toContain("archive");
    expect(ids).toContain("inbox");
    expect(ids).toContain("custom");
    expect(store.getFolder("byjtt")?.name).toBe("Renamed brand folder");
    expect(store.getFolder("byjtt")?.sessionIds).toEqual(["s1"]);
  });

  it("treats a non-array saved payload as a fresh install", async () => {
    const store = new CockpitStore();
    readJsonFile.mockResolvedValue({ folders: [] } as any);
    await store.load();
    expect(store.getFolders().length).toBe(5);
  });
});

describe("CockpitStore.assignSession", () => {
  it("moves a session out of any previous folder into the target", async () => {
    const store = new CockpitStore();
    await store.load();
    writeJsonFile.mockResolvedValue(undefined);

    await store.assignSession("s1", "byjtt");
    expect(store.getFolder("byjtt")?.sessionIds).toContain("s1");
    expect(store.getFolderForSession("s1")?.id).toBe("byjtt");
    expect(store.isUnassigned("s1")).toBe(false);

    await store.assignSession("s1", "jordan");
    expect(store.getFolder("byjtt")?.sessionIds).not.toContain("s1");
    expect(store.getFolderForSession("s1")?.id).toBe("jordan");

    // exactly-one-folder invariant
    const owners = store
      .getFolders()
      .filter((f) => f.sessionIds.includes("s1"));
    expect(owners).toHaveLength(1);
  });

  it("persists on every mutation", async () => {
    const store = new CockpitStore();
    await store.load();
    await store.assignSession("s1", "byjtt");
    expect(writeJsonFile).toHaveBeenCalledTimes(1);
    expect(writeJsonFile.mock.calls[0][0]).toBe("folders");
  });
});

describe("CockpitStore load-failure guards", () => {
  it("records load errors and refuses to persist (no silent default-overwrite)", async () => {
    const store = new CockpitStore();
    readJsonFile.mockRejectedValue(new Error("500 server error"));
    await store.load();

    expect(store.getLoadError()).toContain("500");
    await expect(store.assignSession("s1", "byjtt")).rejects.toThrow(
      /failed to load/i,
    );
    expect(writeJsonFile).not.toHaveBeenCalled();
  });

  it("recovers once a reload succeeds", async () => {
    const store = new CockpitStore();
    readJsonFile.mockRejectedValueOnce(new Error("network down"));
    await store.load();
    await store.load(); // second attempt succeeds (mock default)
    expect(store.getLoadError()).toBeNull();
    await store.assignSession("s1", "byjtt");
    expect(writeJsonFile).toHaveBeenCalled();
  });
});

describe("CockpitStore system folders", () => {
  it("refuses to delete or update system folders", async () => {
    const store = new CockpitStore();
    await store.load();
    await store.deleteFolder("inbox");
    expect(store.getFolder("inbox")).toBeDefined();
    await store.updateFolder("archive", { name: "hijacked" });
    expect(store.getFolder("archive")?.name).not.toBe("hijacked");
  });
});

describe("RepoStore", () => {
  it("addRepo is idempotent by owner/name id", async () => {
    const store = new RepoStore();
    await store.load();
    await store.addRepo("byjtt", "cockpit");
    await store.addRepo("byjtt", "cockpit");
    expect(store.getRepos()).toHaveLength(1);
    expect(store.getRepo("r-byjtt-cockpit")).toBeDefined();
  });

  it("does not persist before load succeeds", async () => {
    const store = new RepoStore();
    readJsonFile.mockRejectedValue(new Error("401 unauthenticated"));
    await store.load();
    await expect(store.setLinked(true, "someone")).rejects.toThrow(
      /failed to load/i,
    );
    expect(writeJsonFile).not.toHaveBeenCalled();
  });
});
