import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Sparkles, ShoppingBag, Key, RefreshCw, MessageSquare, GripVertical, CheckCircle2 } from 'lucide-react';
import { ChatMessage, MenuItem } from '../types';

interface AIChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
  initialQuery?: string;
  menuItems: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  onOpenReservation?: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({
  isOpen,
  onToggle,
  initialQuery,
  menuItems,
  onAddToCart,
  onOpenReservation
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text: "Namaste! 🙏 I am FidsBot, your AI Culinary Assistant for FIDS Indian Cuisine. Ask me about our Vegetarian and Non-Vegetarian delicacies, spice levels, ingredient details, or track your active order!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customOpenAiKey, setCustomOpenAiKey] = useState('');
  const [aiProviderBadge, setAiProviderBadge] = useState<string>('Gemini 3.6 Flash');

  // Position state for the draggable floating circle button
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const defaultX = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 88) : 20;
    const defaultY = typeof window !== 'undefined' ? Math.max(20, window.innerHeight - 88) : 20;
    return { x: defaultX, y: defaultY };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  // Adjust position on window resize so button stays inside screen
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - 72),
        y: Math.min(prev.y, window.innerHeight - 72)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle initial query if passed
  useEffect(() => {
    if (isOpen && initialQuery) {
      handleSendMessage(initialQuery);
    }
  }, [isOpen, initialQuery]);

  // Pointer drag logic for floating circle button
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - dragStartRef.current.x;
      const dy = moveEvt.clientY - dragStartRef.current.y;

      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
      }

      const newX = Math.max(12, Math.min(window.innerWidth - 72, dragStartRef.current.posX + dx));
      const newY = Math.max(12, Math.min(window.innerHeight - 72, dragStartRef.current.posY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      // If user didn't drag, treat as click toggle
      if (!hasMovedRef.current) {
        onToggle();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.slice(-6),
          openAiKey: customOpenAiKey.trim() || undefined
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        if (data.provider) setAiProviderBadge(data.provider);

        // Parse recommendation tags cleanly: [RECOMMEND: item_id | Name | Price]
        const recommendedItemIds: string[] = [];
        const matches = data.reply.match(/\[RECOMMEND:\s*([^\]]+)\]/g);
        if (matches) {
          matches.forEach((m: string) => {
            const inner = m.replace('[RECOMMEND:', '').replace(']', '').trim();
            const itemId = inner.split('|')[0].trim();
            if (itemId && !recommendedItemIds.includes(itemId)) {
              recommendedItemIds.push(itemId);
            }
          });
        }

        const suggestedActions = recommendedItemIds.map(id => {
          const item = menuItems.find(m => m.id === id);
          return item ? {
            label: `Add ${item.name} (${item.is_veg ? 'Veg' : 'Non-Veg'}) - ₹${item.price}`,
            action: 'add_to_cart' as const,
            payload: item
          } : null;
        }).filter(Boolean) as any[];

        const cleanReply = data.reply.replace(/\[RECOMMEND:[^\]]+\]/g, '').trim();

        const botMsg: ChatMessage = {
          id: 'bot-' + Date.now(),
          sender: 'assistant',
          text: cleanReply || "How else can I assist your FIDS dining experience?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: suggestedActions.length > 0 ? suggestedActions : undefined
        };

        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            id: 'bot-err-' + Date.now(),
            sender: 'assistant',
            text: "Welcome to FIDS Indian Cuisine! Our chef recommends our Velvet Butter Chicken and Royal Paneer Butter Masala today.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: 'bot-err-' + Date.now(),
          sender: 'assistant',
          text: "I am having a brief connection hitch. Please try asking again!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Draggable Circle Floating AI Button */}
      <div
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
        onPointerDown={handlePointerDown}
        className={`fixed z-50 select-none touch-none cursor-grab active:cursor-grabbing flex items-center group ${
          isDragging ? 'scale-105 opacity-90' : 'hover:scale-105'
        } transition-transform duration-100`}
        title="Drag to move • Click to toggle FidsBot AI"
      >
        {/* Modern WordPress Inspired Circular Button */}
        <div className="relative w-14 h-14 rounded-full bg-[#1d2327] border-2 border-amber-400/90 text-amber-400 shadow-2xl flex items-center justify-center backdrop-blur-md ring-4 ring-black/40">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-amber-600 text-stone-950 font-black flex items-center justify-center text-xl shadow-inner">
            🤖
          </div>
          
          {/* Active Pulse Status */}
          <span className="w-3.5 h-3.5 bg-emerald-400 border-2 border-stone-900 rounded-full absolute top-0 right-0 animate-pulse shadow-sm" />
        </div>

        {/* Floating Tooltip Label (Gutenberg editorial style) */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2.5 px-3 py-1.5 rounded-full bg-[#1d2327] border border-stone-800 text-white text-xs font-bold shadow-xl backdrop-blur-md pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>FidsBot AI</span>
          <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.2 rounded border border-amber-500/30">
            Move
          </span>
        </div>
      </div>

      {/* Popover Chat Window */}
      {isOpen && (
        <div
          style={{
            bottom: '80px',
            right: Math.max(16, Math.min(typeof window !== 'undefined' ? window.innerWidth - 390 : 20, typeof window !== 'undefined' ? window.innerWidth - position.x - 20 : 20)),
          }}
          className="fixed z-50 w-96 max-w-[calc(100vw-2rem)] h-[530px] bg-[#1d2327] border border-stone-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-stone-100 animate-fadeIn backdrop-blur-xl"
        >
          {/* WordPress Admin Header */}
          <div className="p-4 bg-[#111827] border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-lg shadow-md">
                <Bot className="w-5 h-5 text-stone-950" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-white tracking-wide uppercase">FidsBot AI Assistant</h3>
                  <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded font-mono border border-amber-500/30">
                    {aiProviderBadge}
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 font-light">WordPress Inspired Culinary Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-800 transition-colors"
                title="AI Key Settings"
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <div className="bg-stone-950 p-3.5 border-b border-stone-800 text-xs space-y-2">
              <div className="flex justify-between items-center text-amber-400 font-bold">
                <span>AI API Options</span>
                <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-stone-400 leading-relaxed">
                Default model is Gemini 3.6 Flash. Enter custom OpenAI Key if desired:
              </p>
              <input
                type="password"
                placeholder="sk-..."
                value={customOpenAiKey}
                onChange={(e) => setCustomOpenAiKey(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg p-2 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-stone-900/60 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${
                  msg.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 text-amber-400 border border-amber-500/20'
                }`}>
                  {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div className={`max-w-[85%] rounded-2xl p-3 text-[11px] leading-relaxed space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-amber-500 text-stone-950 rounded-tr-none font-medium'
                    : 'bg-stone-950 text-stone-200 border border-stone-800 rounded-tl-none shadow-sm'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Add to cart smart actions */}
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 border-t border-stone-800 space-y-1.5">
                      {msg.suggestedActions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => onAddToCart(act.payload)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-[10px] hover:bg-amber-500/30 border border-amber-500/40 transition-colors flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5">
                            <ShoppingBag className="w-3 h-3 text-amber-400" />
                            <span>{act.label}</span>
                          </span>
                          <span className="text-amber-400 font-extrabold">+ Add</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`text-[8px] block text-right ${
                    msg.sender === 'user' ? 'text-stone-900 font-bold' : 'text-stone-500'
                  }`}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-amber-400 text-[11px] p-2 font-medium">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>FidsBot consulting kitchen menu...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gutenberg Block Prompts */}
          <div className="px-3 py-1.5 bg-[#111827] border-t border-stone-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[10px]">
            <span className="text-stone-500 font-bold shrink-0">Gutenberg Prompts:</span>
            {[
              "Veg Recommendations",
              "Non-Veg Specials",
              "Spice Levels",
              "Book Dining Table"
            ].map((p) => (
              <button
                key={p}
                onClick={() => {
                  if (p === "Book Dining Table" && onOpenReservation) {
                    onOpenReservation();
                  } else {
                    handleSendMessage(p);
                  }
                }}
                className="px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 hover:text-amber-400 border border-stone-700 shrink-0 font-medium transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-[#111827] border-t border-stone-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Type your culinary question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-xl bg-amber-500 text-stone-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shrink-0 font-bold"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
