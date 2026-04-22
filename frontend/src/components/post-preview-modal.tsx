import { useState, useEffect } from "react";
import { X, Send, Check, Pencil, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import type { Post } from "@/lib/posts-data";
import { postsStore } from "@/lib/posts-store";

const API_BASE = "http://127.0.0.1:8000";

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

export function PostPreviewModal({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const [caption, setCaption] = useState(post?.caption ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [messages, setMessages] = useState<RefineMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption);
      setPublished(post.status === "Published");
      setShowEdit(false);
      setMessages([]);
      try {
        const dt = new Date(post.scheduledFor);
        setScheduledDate(dt.toISOString().split("T")[0]);
        setScheduledTime(dt.toTimeString().slice(0, 5));
      } catch {
        setScheduledDate("");
        setScheduledTime("");
      }
    }
  }, [post?.id]);

  if (!post) return null;

  const handleEdit = async (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setThinking(true);

    const result = await postsStore.editCaptionWithAI(post.id, text);

    if (result) {
      setCaption(result);
      setMessages((m) => [...m, { role: "ai", text: "Updated. Review the caption above." }]);
    } else {
      setMessages((m) => [...m, { role: "ai", text: "Edit failed. Try again." }]);
    }
    setThinking(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/publish`, { method: "POST" });
      const data = await res.json();
      if (data.instagram_id || data.message?.includes("Published")) {
        setPublished(true);
        postsStore.updatePost(post.id, { status: "Published" });
      } else {
        alert("Publishing failed: " + (data.detail || "Unknown error"));
      }
    } catch {
      alert("Publishing failed. Is the backend running?");
    }
    setPublishing(false);
  };

  const handleApprove = () => {
    postsStore.approvePost(post.id);
    onClose();
  };

  const handleReject = () => {
    postsStore.rejectPost(post.id);
    onClose();
  };

  const handleSaveDate = async () => {
    if (!scheduledDate || !scheduledTime) return;
    setSavingDate(true);
    const newScheduled = `${scheduledDate}T${scheduledTime}:00`;
    try {
      await fetch(`${API_BASE}/api/posts/${post.id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `scheduled_for=${encodeURIComponent(newScheduled)}`,
      });
      postsStore.updatePost(post.id, { scheduledFor: newScheduled });
    } catch {}
    setSavingDate(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90dvh] bg-paper rounded-2xl lux-border lux-shadow-xl overflow-hidden flex flex-col">

        {/* Header */}
        <header className="px-5 py-4 border-b border-[#E5E0DB] bg-brand-blush/30 flex items-center justify-between shrink-0">
          <h2 className="font-display text-lg text-brand-charcoal" style={{ fontWeight: 600 }}>Post Preview</h2>
          <button onClick={onClose} className="size-9 bg-paper rounded-full lux-border lux-press flex items-center justify-center">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col md:flex-row">

            {/* Image side */}
            <div className="md:w-1/2 bg-canvas">
              <img src={post.image} alt="" className="w-full aspect-square object-cover" />
            </div>

            {/* Info side */}
            <div className="md:w-1/2 p-5 flex flex-col gap-4">

              {/* Meta badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md bg-brand-gold text-paper">
                  {post.type}
                </span>
                <span className="px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md lux-border bg-paper">
                  {post.platform}
                </span>
                <span className={`px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md ${
                  published ? "bg-brand-charcoal text-paper" :
                  post.status === "Approved" ? "bg-brand-sage/30 text-brand-charcoal" :
                  post.status === "Rejected" ? "bg-brand-rose/20 text-brand-rose" :
                  "bg-brand-cream text-ink/60"
                }`}>
                  {published ? "Published" : post.status}
                </span>
              </div>

              {/* Caption */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1 block font-medium">Caption</label>
                <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">{caption}</p>
              </div>

              {/* Schedule date - editable */}
              <div>
                <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1 block font-medium">Scheduled for</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-canvas lux-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                  />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="bg-canvas lux-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
                  />
                  <button
                    onClick={handleSaveDate}
                    disabled={savingDate}
                    className="px-3 py-2 rounded-lg bg-brand-gold/10 text-brand-charcoal text-xs font-medium lux-press hover:bg-brand-gold/20"
                  >
                    {savingDate ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>

              {/* Edit toggle */}
              {!showEdit && !published && (
                <button
                  onClick={() => {
                    setShowEdit(true);
                    setMessages([{ role: "ai", text: "What would you like to change about this caption?" }]);
                  }}
                  className="flex items-center gap-2 text-sm text-brand-gold font-medium hover:underline"
                >
                  <Pencil className="size-3.5" strokeWidth={1.5} />
                  Edit caption with AI
                </button>
              )}

              {/* AI Edit chat */}
              {showEdit && (
                <div className="bg-brand-gold/5 rounded-xl lux-border p-3 flex flex-col gap-2">
                  <div className="text-[10px] uppercase tracking-wider font-medium text-brand-charcoal mb-1">AI Editor</div>

                  <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                    {messages.map((m, i) => (
                      <div key={i} className={m.role === "ai"
                        ? "text-xs text-ink/70"
                        : "self-end bg-paper lux-border rounded-lg px-2 py-1 text-xs"
                      }>
                        {m.text}
                      </div>
                    ))}
                    {thinking && (
                      <div className="flex gap-1 items-center">
                        <Loader2 className="size-3 text-brand-gold animate-spin" />
                        <span className="text-xs text-muted-foreground">Editing...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {QUICK_ACTIONS.map((q) => (
                      <button key={q} onClick={() => handleEdit(q)} disabled={thinking}
                        className="bg-paper lux-border px-2 py-1 rounded text-[10px] font-medium lux-press disabled:opacity-40">
                        {q}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEdit(input)}
                      placeholder="Tell AI what to change..."
                      className="flex-1 bg-canvas lux-border rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                    />
                    <button onClick={() => handleEdit(input)} disabled={thinking}
                      className="size-8 bg-brand-charcoal text-paper rounded-lg flex items-center justify-center lux-press disabled:opacity-40">
                      <Send className="size-3" strokeWidth={2} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-[#E5E0DB] p-4 bg-paper flex gap-2 shrink-0">
          {post.status === "Draft" && !published && (
            <>
              <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-sage/15 text-brand-charcoal text-sm font-medium lux-press">
                <Check className="size-4" strokeWidth={2} /> Approve
              </button>
              <button onClick={handleReject} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-rose/10 text-brand-rose text-sm font-medium lux-press">
                <X className="size-4" strokeWidth={2} /> Reject
              </button>
            </>
          )}

          {post.status === "Approved" && !published && (
            <button onClick={handlePublish} disabled={publishing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-charcoal text-paper text-sm font-medium lux-press disabled:opacity-50">
              {publishing ? <><Loader2 className="size-4 animate-spin" /> Publishing...</> : <><Send className="size-4" strokeWidth={2} /> Post to Instagram now</>}
            </button>
          )}

          {post.status === "Rejected" && !published && (
            <button onClick={() => setShowEdit(true)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-gold/10 text-brand-charcoal text-sm font-medium lux-press">
              <Pencil className="size-4" strokeWidth={1.5} /> Revise with AI
            </button>
          )}

          {(published || post.status === "Published") && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-sage/15 text-brand-charcoal text-sm font-medium">
              <Check className="size-4" strokeWidth={2} /> Live on Instagram
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
