import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneTilt, Trash, Sparkle } from "@phosphor-icons/react";
import { MessageBubble } from "@/components/MessageBubble";
import { ThinkingDisplay } from "@/components/ThinkingDisplay";

type Message = {
  role: "user" | "assistant";
  content: string;
  links?: Array<{ title: string; url: string }>;
  timestamp: Date;
};

type ThinkingState = {
  understood?: string;
  searchQuery?: string;
  isSearching: boolean;
  resultsCount?: number;
  sources?: string[];
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState<ThinkingState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() },
    ]);
    
    setIsLoading(true);

    // Show thinking state
    setThinking({
      understood: `Analyzing your question about "${userMessage.slice(0, 50)}${userMessage.length > 50 ? "..." : ""}"`,
      searchQuery: userMessage,
      isSearching: true,
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      // Update thinking with results
      if (data.thinking) {
        setThinking({
          understood: data.thinking.understood,
          searchQuery: userMessage,
          isSearching: false,
          resultsCount: data.thinking.resultsCount,
          sources: data.thinking.sources,
        });
      }

      // Wait a moment to show the thinking completion
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Clear thinking and add assistant message
      setThinking(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No response received",
          links: data.links || [],
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error sending message:", error);
      setThinking(null);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setThinking(null);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-transparent" />

      <div className="relative h-full flex flex-col max-w-5xl mx-auto px-4">
        {/* Hero Section - Top 35% */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex-shrink-0 pt-12 pb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm mb-6">
            <Sparkle size={16} className="text-blue-400" weight="fill" />
            <span className="text-sm font-medium text-white/70">
              Powered by Brave Search & Cloudflare AI
            </span>
          </div>

          <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-4">
            NBA Scout Chat
          </h1>
          
          <p className="text-xl text-white/60 font-medium mb-2">
            Live sports analytics with AI
          </p>
          
          <p className="text-white/40">
            Comprehensive NBA and NFL data, stats, and insights
          </p>
        </motion.div>

        {/* Chat Container - Middle 50% */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 && !thinking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center space-y-6 p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl max-w-md">
                <div className="text-5xl mb-4">🏀</div>
                <h3 className="text-xl font-semibold text-white/90">
                  Ask me anything about NBA & NFL
                </h3>
                <div className="space-y-3 text-left">
                  {[
                    "What are the NBA scores today?",
                    "Show me LeBron James stats",
                    "What's the Lakers record this season?",
                  ].map((example, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      onClick={() => setInput(example)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90 transition-all text-sm"
                    >
                      {example}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              links={msg.links}
              timestamp={msg.timestamp}
            />
          ))}

          <AnimatePresence>
            {thinking && (
              <ThinkingDisplay
                understood={thinking.understood}
                searchQuery={thinking.searchQuery}
                isSearching={thinking.isSearching}
                resultsCount={thinking.resultsCount}
                sources={thinking.sources}
              />
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Bottom 15% */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex-shrink-0 pb-6 pt-4"
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-1 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-2 px-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                  placeholder="Ask about NBA scores, stats, or games..."
                  className="flex-1 bg-transparent py-4 text-white placeholder:text-white/40 focus:outline-none disabled:opacity-50"
                />
                
                {messages.length > 0 && (
                  <motion.button
                    type="button"
                    onClick={clearChat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all"
                  >
                    <Trash size={20} />
                  </motion.button>
                )}

                <motion.button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-full bg-gradient-to-r from-blue-600 to-blue-700 p-3 text-white shadow-lg shadow-blue-500/50 transition-all hover:shadow-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <PaperPlaneTilt
                    size={20}
                    weight="fill"
                    className={isLoading ? "animate-pulse" : ""}
                  />
                </motion.button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
