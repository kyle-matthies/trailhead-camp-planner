import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Mic, X, Send, Loader2, Check, Undo2, ListChecks } from "lucide-react";
import { useTrip } from "@/context/useTrip";
import { roleAtLeast } from "@/lib/types";
import { aiAct, aiCommit, aiTranscribe, aiUndo, type PlannedChange, type PlanStep } from "@/lib/aiClient";
import AIPreviewCard from "@/components/ui/AIPreviewCard";
import { cn } from "@/lib/utils";

/**
 * Floating, trip-scoped read/write assistant. Type or speak a request; the agent
 * PROPOSES structured changes; the human confirms before anything is written.
 * Hidden for read-only campers (RLS would reject their writes anyway).
 */
export default function AIComposer() {
  const { tripId, myRole } = useTrip();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [steps, setSteps] = useState<PlanStep[]>([]);
  const [changes, setChanges] = useState<PlannedChange[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!roleAtLeast(myRole, "cit")) return null;

  function reset() {
    setText("");
    setReply("");
    setSteps([]);
    setChanges([]);
    setPlanId(null);
    setSelected({});
    setLastActionId(null);
    setError("");
  }

  function appendTranscript(transcript: string) {
    const clean = transcript.trim();
    if (!clean) return;
    setText((prev) => (prev ? `${prev} ${clean}` : clean));
  }

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }

  function startBrowserSpeech(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return false;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript as string;
      appendTranscript(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
      return true;
    } catch {
      setListening(false);
      return false;
    }
  }

  async function startServerTranscription() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice input isn't supported in this browser — please type instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const options = MediaRecorder.isTypeSupported("audio/webm")
        ? { mimeType: "audio/webm" }
        : undefined;
      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopMediaTracks();
        setListening(false);
        const audio = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];
        if (audio.size === 0) return;
        setBusy(true);
        setError("");
        aiTranscribe(audio)
          .then((res) => appendTranscript(res.text))
          .catch((e) => setError(e instanceof Error ? e.message : "Voice transcription failed"))
          .finally(() => setBusy(false));
      };
      recorder.onerror = () => {
        stopMediaTracks();
        setListening(false);
        setError("Voice transcription failed. Please type instead.");
      };
      mediaRecorderRef.current = recorder;
      setListening(true);
      recorder.start();
    } catch {
      stopMediaTracks();
      setListening(false);
      setError("Microphone access failed. Please type instead.");
    }
  }

  async function toggleVoice() {
    if (listening) {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      } else {
        recognitionRef.current?.stop();
        setListening(false);
      }
      return;
    }
    setError("");
    if (startBrowserSpeech()) return;
    await startServerTranscription();
  }

  async function handlePlan() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    setReply("");
    setSteps([]);
    setChanges([]);
    setPlanId(null);
    try {
      const res = await aiAct(tripId, text.trim());
      setReply(res.reply);
      setPlanId(res.plan_id);
      setSteps(res.steps ?? []);
      setChanges(res.changes);
      setSelected(Object.fromEntries(res.changes.map((c) => [c.id, true])));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assistant failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!planId) return;
    const approved = changes.filter((c) => selected[c.id] ?? true);
    if (approved.length === 0) {
      reset();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await aiCommit(tripId, planId, approved);
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      const failed = res.results.filter((r) => r.status === "error");
      if (failed.length) {
        setError(`${failed.length} change(s) could not be applied: ${failed[0].detail ?? ""}`);
        setSteps([]);
        setChanges([]);
        setPlanId(null);
      } else {
        setText("");
        setSteps([]);
        setChanges([]);
        setPlanId(null);
        setSelected({});
        setLastActionId(res.action_id ?? null);
        setReply(`Applied ${approved.length} change${approved.length === 1 ? "" : "s"}.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!lastActionId || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await aiUndo(tripId, lastActionId);
      qc.invalidateQueries({ queryKey: ["trip", tripId] });
      const failed = res.results.filter((r) => r.status === "error");
      if (!res.ok || failed.length) {
        setError(`Undo could not finish: ${failed[0]?.detail ?? "some changes were not undone"}`);
      } else {
        const count = res.results.filter((r) => r.status === "undone").length;
        setReply(`Undid ${count} AI change${count === 1 ? "" : "s"}.`);
        setLastActionId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Undo failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Floating launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-forest-600 text-white shadow-lg hover:bg-forest-700 transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">Ask the Camp Assistant</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[calc(100vw-3rem)] max-w-md card p-4 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-forest-600" />
              <h3 className="font-heading font-semibold text-stone-900">Camp Assistant</h3>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="p-1 rounded hover:bg-stone-100 text-stone-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-stone-500 mb-2">
            Try: “add hot dogs, buns, and charcoal for everyone” — I’ll propose changes for
            you to confirm.
          </p>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder="Type or speak a request…"
              className="w-full px-3 py-2 pr-10 border-2 border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePlan();
              }}
            />
            <button
              onClick={toggleVoice}
              title="Speak"
              className={cn(
                "absolute right-2 top-2 p-1.5 rounded-full",
                listening ? "bg-red-100 text-red-600 animate-pulse" : "text-stone-400 hover:bg-stone-100"
              )}
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {error}
            </div>
          )}

          {reply && (
            <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap">{reply}</p>
          )}

          {steps.length > 0 && changes.length > 0 && (
            <ol className="mt-3 space-y-2 border border-stone-200 rounded-lg p-2.5 bg-stone-50">
              {steps.map((step, index) => (
                <li key={step.id} className="flex gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-100 text-[11px] font-semibold text-forest-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
                      <ListChecks className="h-3.5 w-3.5 text-forest-600" />
                      <span>{step.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-stone-600 line-clamp-2">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {lastActionId && changes.length === 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleUndo}
                className="btn-outline px-3 py-1.5 text-sm"
                disabled={busy}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Undo2 className="w-4 h-4 mr-1" />}
                Undo AI changes
              </button>
            </div>
          )}

          {changes.length > 0 && (
            <div className="mt-3 space-y-2">
              <AIPreviewCard
                changes={changes}
                selected={selected}
                onToggle={(id) => setSelected((s) => ({ ...s, [id]: !(s[id] ?? true) }))}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setChanges([]);
                    setPlanId(null);
                    setSteps([]);
                    setReply("");
                  }}
                  className="btn-outline px-3 py-1.5 text-sm"
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="btn-primary px-3 py-1.5 text-sm"
                  disabled={busy}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Confirm
                </button>
              </div>
            </div>
          )}

          {changes.length === 0 && (
            <div className="mt-3 flex justify-end">
              <button
                onClick={handlePlan}
                className="btn-primary px-4 py-2 text-sm"
                disabled={busy || !text.trim()}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                Plan it
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
