"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 1, 0.5, 1], // Zen ease
      }}
      className="flex flex-col flex-grow w-full"
    >
      {children}
    </motion.div>
  );
}
