import { useState, useEffect, useRef } from "react";
import { X, Send, Check } from "lucide-react";
import { format } from "date-fns";
import type { Post } from "@/lib/posts-data";
import { postsStore } from "@/lib/posts-store";

interface RefineMessage {
  role: "user" | "ai";
  text: string;
}

const QUICK_ACTIONS = [
  "Make it shorter",
  "More elegant tone",
  "Add a question",
  "Stronger opening line",
  "Add styling tips",
];

export function PostRefinePanel({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [messages, setMessages] = useState<RefineMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (post) {
      setCaption(post.caption);
      setMessages([
        {
          role: "ai",
          text: `This ${post.type.toLowerCase()} post is ready for your review. Want me to adjust the tone, length, or focus?`,
        },
      ]);
    }
  }, [post?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  if (!post) return null;

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);

    // Try backend AI edit first, fallback to client-side
    const result = await postsStore.editCaptionWithAI(post.id, text);
    
    if (result) {
      setCaption(result);
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Done — I've updated the caption. Review it above, or ask for more changes.",
        },
      ]);
    } else {
      // Fallback: simple client-side transforms
      const transforms: Record<string, (c: string) => string> = {
        "Make it shorter": (c) => c.split(/(?<=[.!?])\s+/).slice(0, Math.max(1, Math.floor(c.split(/(?<=[.!?])\s+/).length / 2))).join(" "),
        "More elegant tone": (c) => c.replace(/!\s/g, ". ").replace(/Check out/gi, "Discover"),
        "Add a question": (c) => c + " Which piece speaks to you?",
        "Stronger opening line": (c) => {
          const parts = c.split(/(?<=[.!?])\s+/);
          return parts[0] + " — " + parts.slice(1).join(" ");
        },
        "Add styling tips": (c) => c + "\n\nStyling tip: Pair with gold accessories and nude heels for an elevated evening look.",
      };
      const fn = transforms[text] || transforms["More elegant tone"];
      const newCaption = fn(caption);
      setCaption(newCaption);
      postsStore.updatePost(post.id, { caption: newCaption });
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text: "Updated. Take a look and let me know if you'd like further refinements.",
        },
      ]);
    }
    setThinking(false);
  };

  const apply = () => {
    postsStore.updatePost(post.id, { caption, status: "Approved" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/15 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-[440px] bg-paper lux-border border-r-0 border-y-0 flex flex-col h-dvh lux-shadow-xl">
        <header className="px-5 py-4 border-b border-[#E5E0DB] bg-brand-blush/30 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg text-brand-charcoal" style={{ fontWeight: 600 }}>Refine Post</h2>
          <button
            onClick={onClose}
            className="size-9 bg-paper rounded-full lux-border lux-press flex items-center justify-center"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {/* Image preview */}
          <div className="rounded-2xl lux-border overflow-hidden bg-canvas">
            <img
              src={post.image}
              alt=""
              className="w-full aspect-square object-cover"
              loading="lazy"
            />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md lux-border bg-paper">
              {post.platform}
            </span>
            <span className="px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md bg-brand-gold text-paper">
              {post.type}
            </span>
            <span className="ml-auto text-muted-foreground text-xs">
              {format(new Date(post.scheduledFor), "EEE, MMM d · h:mma")}
            </span>
          </div>

          {/* Editable caption */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2 block font-medium">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={6}
              className="w-full bg-canvas lux-border rounded-xl p-4 text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
            />
            <div className="text-right text-xs text-muted-foreground mt-1">
              {caption.length} characters
            </div>
          </div>

          {/* AI Chat section */}
          <div className="bg-brand-gold/5 rounded-xl lux-border p-4 flex flex-col gap-3 relative mt-1">
            <div className="absolute -top-3 left-4 px-2 py-0.5 bg-brand-gold/15 rounded-md text-[10px] uppercase tracking-wider font-medium text-brand-charcoal">
              AI Assistant
            </div>
            <div className="pt-2 flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={
                    m.role === "ai"
                      ? "text-sm text-ink/80 leading-relaxed"
                      : "self-end bg-paper lux-border rounded-xl px-3 py-2 text-sm max-w-[85%]"
                  }
                >
                  {m.text}
                </div>
              ))}
              {thinking && (
                <div className="flex gap-1.5 py-1 items-center">
                  <div className="size-1.5 rounded-full bg-brand-gold animate-bounce" />
                  <div className="size-1.5 rounded-full bg-brand-gold animate-bounce [animation-delay:150ms]" />
                  <div className="size-1.5 rounded-full bg-brand-gold animate-bounce [animation-delay:300ms]" />
                  <span className="text-xs text-muted-foreground ml-2">Refining...</span>
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_ACTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={thinking}
                  className="bg-paper lux-border text-ink font-medium py-1.5 px-3 rounded-lg lux-press text-xs disabled:opacity-40 hover:bg-brand-cream/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#E5E0DB] p-4 bg-paper flex flex-col gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Tell AI what to change..."
              className="flex-1 bg-canvas rounded-xl lux-border px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
            />
            <button
              onClick={() => send(input)}
              disabled={thinking}
              className="size-10 bg-brand-charcoal text-paper rounded-xl lux-press flex items-center justify-center disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" strokeWidth={1.5} />
            </button>
          </div>
          <button
            onClick={apply}
            className="w-full bg-brand-charcoal text-paper font-medium text-sm py-3 rounded-xl lux-press flex items-center justify-center gap-2"
          >
            <Check className="size-4" strokeWidth={2} />
            Approve & schedule
          </button>
        </div>
      </aside>
    </div>
  );
}
