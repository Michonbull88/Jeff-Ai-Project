"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
export function Startup() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("jeff-ready")) return;
      sessionStorage.setItem("jeff-ready", "1");
    } catch {}
    const show = setTimeout(() => setVisible(true), 0);
    const interval = setInterval(() => setStep((v) => v + 1), 450);
    const end = setTimeout(() => setVisible(false), 1750);
    return () => {
      clearTimeout(show);
      clearInterval(interval);
      clearTimeout(end);
    };
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="startup"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="boot-symbol">
            j<span>.</span>
          </div>
          <p>
            {
              [
                "Initializing neural interface",
                "Preparing intelligence layer",
                "Audio interface ready",
                "JEFF ONLINE",
              ][Math.min(step, 3)]
            }
            <span className="boot-dots">...</span>
          </p>
          <button onClick={() => setVisible(false)}>
            Skip intro <span>↗</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
