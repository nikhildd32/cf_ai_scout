import { motion } from "framer-motion";
import { MemoizedMarkdown } from "./memoized-markdown";

interface Link {
  title: string;
  url: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  links?: Link[];
  timestamp: Date;
}

export function MessageBubble({
  role,
  content,
  links,
  timestamp,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Message Content */}
        <div
          className={`rounded-3xl px-6 py-4 ${
            isUser
              ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20"
              : "border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl"
          }`}
        >
          <div className={isUser ? "text-white" : "text-white/90"}>
            <MemoizedMarkdown id={`msg-${timestamp.getTime()}`} content={content} />
          </div>
        </div>

        {/* Links Section */}
        {!isUser && links && links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 space-y-2"
          >
            <div className="text-xs font-medium text-white/50 px-2">
              📚 Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {links.map((link, idx) => (
                <motion.a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                  whileHover={{
                    scale: 1.05,
                    transition: { duration: 0.2 },
                  }}
                  className="group inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400 backdrop-blur-sm transition-all hover:border-blue-400/50 hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <span>{link.title}</span>
                  <svg
                    className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </motion.a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timestamp */}
        <div
          className={`mt-2 px-2 text-xs text-white/40 ${
            isUser ? "text-right" : "text-left"
          }`}
        >
          {timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </motion.div>
  );
}

