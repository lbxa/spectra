import type { InsertionRelation, WorkerSessionState } from "../lib/library/messages";

const SESSION_KEY = "spectra.preview.sessions.v1";
const CAPTURE_TARGET_KEY = "spectra.capture.targets.v1";

export type WorkerPreviewSession = {
  tabId: number;
  componentId: string;
  activeCollectionId: string;
  status: WorkerSessionState;
  lastPreviewId?: string;
  lastRelation?: InsertionRelation;
  lastErrorCode?: string;
  updatedAt: string;
};

type SessionRecord = Record<string, WorkerPreviewSession>;
type CaptureTargetRecord = Record<string, string>;

export async function getPreviewSession(tabId: number): Promise<WorkerPreviewSession | null> {
  const sessions = await readSessions();
  return sessions[String(tabId)] ?? null;
}

export async function setPreviewSession(session: WorkerPreviewSession): Promise<void> {
  const sessions = await readSessions();
  sessions[String(session.tabId)] = {
    ...session,
    updatedAt: new Date().toISOString()
  };
  await writeSessions(sessions);
}

export async function updatePreviewSession(
  tabId: number,
  patch: Partial<Omit<WorkerPreviewSession, "tabId" | "updatedAt">>
): Promise<WorkerPreviewSession | null> {
  const existing = await getPreviewSession(tabId);
  if (!existing) {
    return null;
  }
  const next: WorkerPreviewSession = {
    ...existing,
    ...patch,
    tabId,
    updatedAt: new Date().toISOString()
  };
  await setPreviewSession(next);
  return next;
}

export async function clearPreviewSession(tabId: number): Promise<void> {
  const sessions = await readSessions();
  delete sessions[String(tabId)];
  await writeSessions(sessions);
}

export async function setCaptureTargetCollectionId(tabId: number, collectionId: string): Promise<void> {
  const targets = await readCaptureTargets();
  targets[String(tabId)] = collectionId;
  await writeCaptureTargets(targets);
}

export async function getCaptureTargetCollectionId(tabId: number): Promise<string | null> {
  const targets = await readCaptureTargets();
  const target = targets[String(tabId)];
  return typeof target === "string" && target.length > 0 ? target : null;
}

export async function clearCaptureTargetCollectionId(tabId: number): Promise<void> {
  const targets = await readCaptureTargets();
  delete targets[String(tabId)];
  await writeCaptureTargets(targets);
}

async function readSessions(): Promise<SessionRecord> {
  const storage = await chrome.storage.session.get([SESSION_KEY]);
  const candidate = storage[SESSION_KEY];
  if (!candidate || typeof candidate !== "object") {
    return {};
  }
  return candidate as SessionRecord;
}

async function writeSessions(sessions: SessionRecord): Promise<void> {
  await chrome.storage.session.set({ [SESSION_KEY]: sessions });
}

async function readCaptureTargets(): Promise<CaptureTargetRecord> {
  const storage = await chrome.storage.session.get([CAPTURE_TARGET_KEY]);
  const candidate = storage[CAPTURE_TARGET_KEY];
  if (!candidate || typeof candidate !== "object") {
    return {};
  }
  return candidate as CaptureTargetRecord;
}

async function writeCaptureTargets(targets: CaptureTargetRecord): Promise<void> {
  await chrome.storage.session.set({ [CAPTURE_TARGET_KEY]: targets });
}
