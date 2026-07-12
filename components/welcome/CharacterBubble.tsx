'use client';

import { AnimatePresence, motion } from 'framer-motion';

export function CharacterBubble({
  message,
  polite,
}: {
  message: string | null;
  polite: boolean;
}) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key={message}
          className="speech-bubble"
          role="status"
          aria-live={polite ? 'polite' : 'off'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
