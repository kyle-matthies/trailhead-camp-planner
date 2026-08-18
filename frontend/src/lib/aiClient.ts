import { getAccessToken } from "./supabase";

const AI_URL = (import.meta.env.VITE_AI_API_URL as string) || "http://localhost:8000";

export interface PlannedChange {
  id: string;
  tool: string;
  label: string;
  op: "insert" | "update" | "delete";
  table: string;
  fields: Record<string, unknown>;
}

export interface PlanStep {
  id: string;
  title: string;
  detail: string;
  change_ids: string[];
}

export interface ActResponse {
  plan_id: string;
  /** Natural-language summary or refusal message. */
  reply: string;
  steps: PlanStep[];
  changes: PlannedChange[];
}

export interface CommitResult {
  action_id?: string | null;
  ok: boolean;
  results: { id: string; status: "applied" | "error"; detail?: string }[];
}

export interface UndoResult {
  action_id?: string | null;
  ok: boolean;
  results: {
    id: string;
    status: "undone" | "skipped" | "error";
    detail?: string;
    table?: string;
    row_id?: string;
  }[];
}

export interface TranscribeResponse {
  text: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("You must be signed in to use the assistant.");
  const res = await fetch(`${AI_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Assistant error (${res.status})`);
  }
  return res.json();
}

async function postForm<T>(path: string, body: FormData): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error("You must be signed in to use the assistant.");
  const res = await fetch(`${AI_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `Assistant error (${res.status})`);
  }
  return res.json();
}

/** Ask the agent to PLAN changes (no writes yet — preview returned). */
export function aiAct(tripId: string, utterance: string): Promise<ActResponse> {
  return post<ActResponse>("/api/ai/act", { trip_id: tripId, utterance });
}

/** Commit the user-approved subset of a plan (writes happen here, as the user, via RLS). */
export function aiCommit(
  tripId: string,
  planId: string,
  changes: PlannedChange[]
): Promise<CommitResult> {
  return post<CommitResult>("/api/ai/commit", {
    trip_id: tripId,
    plan_id: planId,
    changes,
  });
}

/** Undo a previously committed AI action by deleting rows recorded in its audit result. */
export function aiUndo(tripId: string, actionId?: string | null): Promise<UndoResult> {
  return post<UndoResult>("/api/ai/undo", {
    trip_id: tripId,
    action_id: actionId,
  });
}

export function aiTranscribe(audio: Blob): Promise<TranscribeResponse> {
  const form = new FormData();
  form.append("audio", audio, "voice.webm");
  return postForm<TranscribeResponse>("/api/ai/transcribe", form);
}
