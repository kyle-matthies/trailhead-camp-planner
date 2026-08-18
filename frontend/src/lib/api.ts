// Calls to the slim FastAPI service: the public learning catalog + the educational
// Gemini chat. All trip CRUD now goes through supabase-js directly (RLS-gated) and
// the read/write agent lives in lib/aiClient.ts.
import { getAccessToken } from "@/lib/supabase";

const AI_URL = (import.meta.env.VITE_AI_API_URL as string) || "http://localhost:8000";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Public catalog (no auth) ──

export async function fetchGearCategories() {
  const res = await fetch(`${AI_URL}/api/gear`);
  if (!res.ok) throw new Error("Failed to fetch gear categories");
  return res.json();
}

export async function fetchLearnTopics() {
  const res = await fetch(`${AI_URL}/api/learn`);
  if (!res.ok) throw new Error("Failed to fetch learn topics");
  return res.json();
}

export async function fetchLearnTopic(topicId: string) {
  const res = await fetch(`${AI_URL}/api/learn/${topicId}`);
  if (!res.ok) throw new Error("Failed to fetch topic");
  return res.json();
}

export async function checkChatStatus() {
  const res = await fetch(`${AI_URL}/api/chat/status`);
  if (!res.ok) return { configured: false };
  return res.json();
}

// ── Educational chat (auth required: Supabase access token) ──

export async function sendChatMessage(
  message: string,
  conversationHistory: ChatMessage[]
) {
  const token = await getAccessToken();
  const res = await fetch(`${AI_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_history: conversationHistory }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Failed to send message");
  }
  return res.json();
}
