'use client';
import { motion } from 'motion/react';

const titleContainerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.1,
    },
  },
};

const letterVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

export default function AnimatedPageTitle({ title, className = '' }) {
  if (!title) return null;
  const text = String(title);
  const words = text.split(' ');

  return (
    <motion.h1
      className={`text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-slate-900 inline-block cursor-default select-none leading-tight ${className}`}
      variants={titleContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split('').map((char, index) => (
            <motion.span
              key={index}
              variants={letterVariants}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
          {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </motion.h1>
  );
}
