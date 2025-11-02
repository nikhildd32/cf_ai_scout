/** biome-ignore-all lint/correctness/useUniqueElementIds: it's alright */
import { useEffect, useState, useRef, useCallback } from "react";

// Component imports
import { Button } from "@/components/button/Button";
import { Card } from "@/components/card/Card";
import { Avatar } from "@/components/avatar/Avatar";
import { Textarea } from "@/components/textarea/Textarea";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

// Icon imports
import {
  Moon,
  PaperPlaneTilt,
  Robot,
  Sun,
  Trash
} from "@phosphor-icons/react";



type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function Chat() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    // Check localStorage first, default to dark if not found
    const savedTheme = localStorage.getItem("theme");
    return (savedTheme as "dark" | "light") || "dark";
  });
  // ALWAYS start with empty messages - stateless on every reload
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState("auto");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure messages are cleared on mount (stateless requirement)
  useEffect(() => {
    setMessages([]);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    // Apply theme class on mount and when theme changes
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }

    // Save theme preference to localStorage
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Scroll to bottom on mount
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  const [agentInput, setAgentInput] = useState("");
  const handleAgentInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAgentInput(e.target.value);
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentInput.trim() || isLoading) return;

    const userMessage = agentInput;
    setAgentInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: new Date() }
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage })
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantContent = "";
      const assistantMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg === assistantMessage ? { ...msg, content: assistantContent } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble browsing right now. Please try again.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messages.length > 0 && scrollToBottom();
  }, [messages, scrollToBottom]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="h-[100vh] w-full p-4 flex justify-center items-center bg-fixed overflow-hidden">
      <div className="h-[calc(100vh-2rem)] w-full mx-auto max-w-lg flex flex-col shadow-xl rounded-md overflow-hidden relative border border-neutral-300 dark:border-neutral-800">
        <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-800 flex items-center gap-3 sticky top-0 z-10">
          <div className="flex items-center justify-center h-8 w-8">
            <Robot size={28} className="text-[#F48120]" />
          </div>

          <div className="flex-1">
            <h2 className="font-semibold text-base">NBA Scout Chat</h2>
          </div>

          <Button
            variant="ghost"
            size="md"
            shape="square"
            className="rounded-full h-9 w-9"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>

          <Button
            variant="ghost"
            size="md"
            shape="square"
            className="rounded-full h-9 w-9"
            onClick={() => window.location.reload()}
          >
            <Trash size={20} />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 max-h-[calc(100vh-10rem)]">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <Card className="p-6 max-w-md mx-auto bg-neutral-100 dark:bg-neutral-900">
                <div className="text-center space-y-4">
                  <div className="bg-[#F48120]/10 text-[#F48120] rounded-full p-3 inline-flex">
                    <Robot size={24} />
                  </div>
                  <h3 className="font-semibold text-lg">Welcome to NBA Scout</h3>
                  <p className="text-muted-foreground text-sm">
                    Ask me about live NBA data. Try asking:
                  </p>
                  <ul className="text-sm text-left space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">•</span>
                      <span>Who scored the most points last night?</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">•</span>
                      <span>What's the Lakers game score today?</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#F48120]">•</span>
                      <span>Show me LeBron James recent stats</span>
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          )}

          {messages.map((m, index) => {
            const isUser = m.role === "user";
            const showAvatar =
              index === 0 || messages[index - 1]?.role !== m.role;

            return (
              <div key={index}>
                <div
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`flex gap-2 max-w-[85%] ${
                      isUser ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {showAvatar && !isUser ? (
                      <Avatar username={"AI"} />
                    ) : (
                      !isUser && <div className="w-8" />
                    )}

                    <div>
                      <Card
                        className={`p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 ${
                          isUser
                            ? "rounded-br-none"
                            : "rounded-bl-none border-assistant-border"
                        }`}
                      >
                        <MemoizedMarkdown id={`msg-${index}`} content={m.content} />
                      </Card>
                      <p
                        className={`text-xs text-muted-foreground mt-1 ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {formatTime(m.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-2 max-w-[85%]">
                <Avatar username={"AI"} />
                <Card className="p-3 rounded-md bg-neutral-100 dark:bg-neutral-900 rounded-bl-none border-assistant-border">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse">Thinking...</div>
                  </div>
                </Card>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form
          onSubmit={handleAgentSubmit}
          className="p-3 bg-neutral-50 absolute bottom-0 left-0 right-0 z-10 border-t border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Textarea
                disabled={isLoading}
                placeholder="Ask about NBA scores, stats, or games..."
                className="flex w-full border border-neutral-200 dark:border-neutral-700 px-3 py-2 ring-offset-background placeholder:text-neutral-500 dark:placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:focus-visible:ring-neutral-700 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base pb-10 dark:bg-neutral-900"
                value={agentInput}
                onChange={(e) => {
                  handleAgentInputChange(e);
                  // Auto-resize the textarea
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  setTextareaHeight(`${e.target.scrollHeight}px`);
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    handleAgentSubmit(e);
                    setTextareaHeight("auto"); // Reset height on Enter submission
                  }
                }}
                rows={2}
                style={{ height: textareaHeight }}
              />
              <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full p-1.5 h-fit border border-neutral-200 dark:border-neutral-800"
                  disabled={isLoading || !agentInput.trim()}
                  aria-label="Send message"
                >
                  <PaperPlaneTilt size={16} />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
