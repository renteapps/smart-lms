"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Sparkles, Bot } from "lucide-react";

export default function ChatSticker() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{role: 'ai' | 'user', text: string}[]>([
    { role: 'ai', text: 'Olá! Sou a assistente de IA da plataforma. Como posso ajudar você hoje?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', text: input }]);
    setInput('');
    setIsTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { role: 'ai', text: 'Entendi! Posso ajudar com suas dúvidas sobre nossos cursos ou com a navegação da plataforma.' }]);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} // smooth spring-like ease
            className="mb-4 bg-surface/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary/10 w-[340px] sm:w-[380px] overflow-hidden border border-border/50 flex flex-col"
            style={{ height: '520px', maxHeight: 'calc(100vh - 120px)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-5 flex items-center justify-between text-on-primary relative overflow-hidden">
              {/* Decorative background blur in header */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-sm">
                  <Bot size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold font-manrope text-base leading-tight">Assistente IA</h3>
                  <p className="text-xs text-white/80 font-medium mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                    Online agora
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-all hover:bg-white/20 p-2 rounded-full relative z-10 hover:rotate-90 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 p-5 overflow-y-auto bg-gradient-to-b from-bg/30 to-bg/50 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                >
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-auto mb-1">
                      <Sparkles size={14} className="text-primary" />
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[80%] p-3.5 text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-primary to-primary/90 text-on-primary rounded-2xl rounded-tr-sm' 
                        : 'bg-surface border border-border/40 text-text rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-auto mb-1">
                    <Sparkles size={14} className="text-primary" />
                  </div>
                  <div className="bg-surface border border-border/40 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1 shadow-sm">
                    <motion.div 
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div 
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div 
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface border-t border-border/50">
              <div className="flex items-center gap-2 bg-bg border border-border/80 rounded-full px-2 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/50 transition-all">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Mensagem para a IA..." 
                  className="flex-1 bg-transparent border-none px-4 py-2 text-sm focus:outline-none focus:ring-0 placeholder:text-text-mute text-text"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="bg-primary text-on-primary p-2.5 rounded-full disabled:opacity-40 disabled:scale-95 transition-all hover:bg-primary-active hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
              <div className="text-center mt-3">
                <span className="text-[10px] text-text-mute font-medium tracking-wide uppercase">IA pode cometer erros. Verifique informações.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 text-on-primary rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-all ml-auto relative group border border-primary/20 backdrop-blur-sm"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquare size={28} />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Animated sparkles removed as requested */}
      </motion.button>
    </div>
  );
}
