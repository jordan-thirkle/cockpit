// Cockpit organization model.
// Folders group sessions; each session can belong to exactly one folder.
// Workspace metadata (quick-links, notes, accent) lives per-folder.
// All persisted server-side via hermesApi.readJsonFile/writeJsonFile.

export interface CockpitFolder {
  id: string;
  name: string;
  /** lower priority = higher in the sidebar */
  order: number;
  /** an emoji or short glyph for the folder icon */
  icon?: string;
  /** short byline shown under the name */
  subtitle?: string;
  /** quick-links rendered in the workspace panel */
  links?: { label: string; url: string }[];
  /** free-form workspace notes */
  notes?: string;
  /** session ids assigned to this folder */
  sessionIds: string[];
  /** system folders are not deletable */
  system?: boolean;
}

const DEFAULT_FOLDERS: CockpitFolder[] = [
  {
    id: "byjtt",
    name: "byjtt.com",
    order: 0,
    icon: "◆",
    subtitle: "Brand, site, publishing, evidence",
    sessionIds: [],
    links: [
      { label: "byjtt.com repo", url: "D:/Projects/byjtt-com" },
      { label: "Publishing evidence", url: "D:/Projects/byjtt-com/src/content" },
    ],
  },
  {
    id: "jordan",
    name: "Jordan",
    order: 1,
    icon: "✦",
    subtitle: "Personal, strategy, planning",
    sessionIds: [],
  },
  {
    id: "toolkit",
    name: "Toolkit",
    order: 2,
    icon: "⚙",
    subtitle: "Infra, scripts, agents, maintenance",
    sessionIds: [],
    links: [{ label: "Toolkit repo", url: "D:/Projects/Toolkit" }],
  },
  {
    id: "archive",
    name: "Archive",
    order: 99,
    icon: "▤",
    subtitle: "Done / parked sessions",
    sessionIds: [],
    system: true,
  },
  {
    id: "inbox",
    name: "Inbox",
    order: 100,
    icon: "✉",
    subtitle: "Unfiled sessions",
    sessionIds: [],
    system: true,
  },
];

const STORE_KEY = "folders";

export class CockpitStore {
  private folders: CockpitFolder[] = structuredClone(DEFAULT_FOLDERS);
  private loaded = false;

  async load(): Promise<void> {
    const saved = await import("@/lib/hermesApi").then((m) =>
      m.readJsonFile<CockpitFolder[]>(STORE_KEY, DEFAULT_FOLDERS),
    );
    // Merge: keep system folders from defaults, overlay saved user folders.
    this.folders = this.mergeFolders(saved);
    this.loaded = true;
  }

  private mergeFolders(saved: CockpitFolder[]): CockpitFolder[] {
    const byId = new Map<string, CockpitFolder>();
    for (const f of DEFAULT_FOLDERS) byId.set(f.id, structuredClone(f));
    for (const f of saved) byId.set(f.id, { ...f });
    return [...byId.values()].sort((a, b) => a.order - b.order);
  }

  async persist(): Promise<void> {
    await import("@/lib/hermesApi").then((m) => m.writeJsonFile(STORE_KEY, this.folders));
  }

  getFolders(): CockpitFolder[] {
    return [...this.folders].sort((a, b) => a.order - b.order);
  }

  getFolder(id: string): CockpitFolder | undefined {
    return this.folders.find((f) => f.id === id);
  }

  getFolderForSession(sessionId: string): CockpitFolder | undefined {
    return this.folders.find((f) => f.sessionIds.includes(sessionId));
  }

  inboxId(): string {
    return "inbox";
  }

  async createFolder(name: string): Promise<CockpitFolder> {
    const folder: CockpitFolder = {
      id: "f-" + crypto.randomUUID().slice(0, 8),
      name,
      order: this.folders.length,
      icon: "▦",
      sessionIds: [],
    };
    this.folders.push(folder);
    await this.persist();
    return folder;
  }

  async updateFolder(id: string, patch: Partial<CockpitFolder>): Promise<void> {
    const f = this.getFolder(id);
    if (!f || f.system) return;
    Object.assign(f, patch);
    await this.persist();
  }

  async deleteFolder(id: string): Promise<void> {
    const f = this.getFolder(id);
    if (!f || f.system) return;
    this.folders = this.folders.filter((x) => x.id !== id);
    await this.persist();
  }

  async assignSession(sessionId: string, folderId: string): Promise<void> {
    for (const f of this.folders) {
      f.sessionIds = f.sessionIds.filter((s) => s !== sessionId);
    }
    const target = this.getFolder(folderId) ?? this.getFolder(this.inboxId());
    if (target) target.sessionIds.unshift(sessionId);
    await this.persist();
  }

  async unassignSession(sessionId: string): Promise<void> {
    await this.assignSession(sessionId, this.inboxId());
  }

  /** Sessions with no folder assigned (belong to inbox implicitly). */
  isUnassigned(sessionId: string): boolean {
    return !this.folders.some(
      (f) => f.id !== "inbox" && f.id !== "archive" && f.sessionIds.includes(sessionId),
    );
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

export const cockpitStore = new CockpitStore();
