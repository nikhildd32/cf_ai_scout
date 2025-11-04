import { motion } from "framer-motion";
import { MagnifyingGlass, CheckCircle, ChartBar } from "@phosphor-icons/react";

interface ThinkingDisplayProps {
  understood?: string;
  searchQuery?: string;
  isSearching?: boolean;
  resultsCount?: number;
  sources?: string[];
}

export function ThinkingDisplay({
  understood,
  searchQuery,
  isSearching,
  resultsCount,
  sources,
}: ThinkingDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="mb-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4 backdrop-blur-xl"
    >
      <div className="space-y-3">
        {/* Understanding */}
        {understood && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start gap-3"
          >
            <span className="text-xl">🤔</span>
            <div>
              <div className="text-xs font-medium text-white/60">
                Understanding
              </div>
              <div className="text-sm text-white/90">{understood}</div>
            </div>
          </motion.div>
        )}

        {/* Searching */}
        {searchQuery && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 pl-4 border-l-2 border-blue-500/30"
          >
            <MagnifyingGlass
              size={20}
              className={`text-blue-400 ${isSearching ? "animate-pulse" : ""}`}
            />
            <div>
              <div className="text-xs font-medium text-white/60">Searching</div>
              <div className="text-sm text-white/90">
                Searching Brave for "{searchQuery}"
                {isSearching && (
                  <span className="ml-2 inline-flex gap-1">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: 0,
                      }}
                    >
                      .
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    >
                      .
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: 0.4,
                      }}
                    >
                      .
                    </motion.span>
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Found Results */}
        {!isSearching && resultsCount !== undefined && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-start gap-3 pl-8 border-l-2 border-green-500/30"
          >
            <CheckCircle size={20} className="text-green-400" weight="fill" />
            <div>
              <div className="text-xs font-medium text-white/60">Found</div>
              <div className="text-sm text-white/90">
                {resultsCount} relevant results
                {sources && sources.length > 0 && (
                  <span className="ml-1 text-white/60">
                    from {sources.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Compiling */}
        {!isSearching && resultsCount !== undefined && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-start gap-3"
          >
            <ChartBar size={20} className="text-purple-400" weight="fill" />
            <div>
              <div className="text-xs font-medium text-white/60">Compiling</div>
              <div className="text-sm text-white/90">
                Structuring data for you...
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

