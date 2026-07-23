"use client";

import React from "react";
import { motion } from "framer-motion";

type CarouselRowProps = {
  title?: string;
  children: React.ReactNode;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.8,
      ease: [0.25, 1, 0.5, 1] as any // Zen ease
    }
  }
};

export default function CarouselRow({ title, children }: CarouselRowProps) {
  return (
    <section className="py-6">
      {title && <h2 className="text-xl md:text-2xl font-display font-extrabold mb-4 text-text px-4 md:px-12">{title}</h2>}
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        className="flex gap-4 md:gap-8 overflow-x-auto hide-scrollbar snap-x snap-mandatory py-8 -my-8 px-4 md:px-12"
      >
        {React.Children.map(children, (child) => (
          <motion.div variants={itemVariants} className="snap-start shrink-0">
            {child}
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
