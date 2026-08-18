import { useState, useRef, useEffect } from "react";
import {
  Send,
  Loader2,
  TreePine,
  Sparkles,
  Mountain,
  Tent,
  Map,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { sendChatMessage, checkChatStatus, type ChatMessage } from "@/lib/api";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { icon: HelpCircle, text: "I've never been camping before" },
  { icon: Tent, text: "What gear do I need for a first trip?" },
  { icon: Mountain, text: "Best places for beginners?" },
  { icon: Map, text: "Help me plan my first camping trip" },
];

export default function Chat() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkChatStatus().then((data) => setAiConfigured(data.configured));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const data = await sendChatMessage(messageText, history);

      const assistantMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-sand-50 to-forest-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <TreePine className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <h1 className="text-base font-heading font-semibold text-stone-900">
              Trailhead Camp Planner Assistant
            </h1>
            <p className="text-xs text-stone-500">Your personal camping guide</p>
          </div>
        </div>
      </div>

      {/* AI not configured warning */}
      {aiConfigured === false && (
        <div className="bg-campfire-50 border-b border-campfire-200 px-4 py-2">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-campfire-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>
              AI chat is not configured yet. Set the GOOGLE_GEMINI_API_KEY on the
              backend to enable it.
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {messages.length === 0 ? (
            <div className="text-center space-y-8 mt-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-forest-100 rounded-full">
                  <Sparkles className="w-4 h-4 text-forest-600" />
                  <span className="text-sm font-medium text-forest-700">
                    AI-Powered Guidance
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-stone-900">
                  Welcome to Your Camping Journey!
                </h2>
                <p className="text-lg text-stone-500 max-w-xl mx-auto">
                  I'm here to help you discover the joy of camping. Ask me
                  anything about gear, locations, or getting started!
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-stone-400">
                  Try one of these to get started:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                  {quickPrompts.map((prompt, i) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        disabled={aiConfigured === false}
                        className="flex items-center gap-3 p-4 rounded-lg border-2 border-stone-200 text-left transition-all hover:border-forest-400 hover:bg-forest-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Icon className="w-5 h-5 text-forest-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-stone-700">
                          {prompt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center">
                        <TreePine className="w-4 h-4 text-forest-600" />
                      </div>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block px-4 py-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-forest-600 text-white"
                          : "bg-white text-stone-900 shadow-sm border border-stone-100"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose text-sm sm:text-base">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm sm:text-base whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-1 px-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-forest-100 rounded-lg flex items-center justify-center">
                      <TreePine className="w-4 h-4 text-forest-600" />
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
                      <span className="text-sm text-stone-500">
                        Thinking about your camping needs...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/80 backdrop-blur-md border-t border-stone-200 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                aiConfigured === false
                  ? "AI chat not configured..."
                  : "Ask me anything about camping..."
              }
              disabled={aiConfigured === false}
              rows={1}
              className="flex-1 resize-none max-h-32 px-4 py-2.5 bg-white border-2 border-stone-200 rounded-xl text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || aiConfigured === false}
              className="btn-primary p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
