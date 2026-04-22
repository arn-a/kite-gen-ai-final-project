import type { Post } from "@/lib/posts-data";
import { postsStore } from "@/lib/posts-store";
import { format } from "date-fns";
import { Check, X, Pencil, Send, Loader2 } from "lucide-react";
import { useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

const typeColorMap: Record<Post["color"], string> = {
  gold: "bg-brand-gold text-paper",
  blush: "bg-brand-rose/80 text-paper",
  sage: "bg-brand-sage text-paper",
  rose: "bg-brand-rose text-paper",
  cream: "bg-brand-charcoal/70 text-paper",
  charcoal: "bg-brand-charcoal text-paper",
};

const statusStyle: Record<Post["status"], string> = {
  Draft: "bg-brand-cream text-ink/60",
  Approved: "bg-brand-sage/30 text-brand-charcoal",
  Rejected: "bg-brand-rose/20 text-brand-rose",
  Scheduled: "bg-brand-gold/20 text-brand-charcoal",
  Published: "bg-brand-charcoal text-paper",
};

export function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(post.status === "Published");

  const handleApprove = (e: React.MouseEvent) => {
    e.stopPropagation();
    postsStore.approvePost(post.id);
  };

  const handleReject = (e: React.MouseEvent) => {
    e.stopPropagation();
    postsStore.rejectPost(post.id);
  };

  const handlePublish = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/posts/${post.id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.instagram_id || data.message?.includes("Published")) {
        setPublished(true);
        postsStore.updatePost(post.id, { status: "Published" });
      } else {
        alert("Publishing failed: " + (data.detail || "Unknown error"));
      }
    } catch (err) {
      alert("Publishing failed. Is the backend running?");
    }
    setPublishing(false);
  };

  return (
    <div className="bg-paper rounded-2xl lux-border lux-shadow flex flex-col overflow-hidden group">
      <button
        onClick={onClick}
        className="relative aspect-[4/3] overflow-hidden border-b border-[#E5E0DB] bg-canvas lux-press"
      >
        <img
          src={post.image}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          <span className={`px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md ${typeColorMap[post.color]}`}>
            {post.type}
          </span>
        </div>
        <div className="absolute bottom-3 left-3">
          <span className="px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md bg-paper/90 backdrop-blur-sm text-ink/70">
            {post.platform}
          </span>
        </div>
      </button>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <p className="text-[13px] leading-relaxed line-clamp-3 text-ink/75">
          {post.caption}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2">
          <span className={`px-2 py-0.5 font-medium text-[10px] uppercase tracking-wider rounded-md ${statusStyle[post.status]}`}>
            {published ? "Published" : post.status}
          </span>
          <span className="text-muted-foreground text-xs">
            {format(new Date(post.scheduledFor), "EEE, MMM d · h:mma")}
          </span>
        </div>

        {/* Draft actions */}
        {post.status === "Draft" && !published && (
          <div className="flex gap-2 pt-1 border-t border-[#E5E0DB]">
            <button onClick={handleApprove} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-sage/15 text-brand-charcoal text-xs font-medium lux-press hover:bg-brand-sage/25 transition-colors">
              <Check className="size-3.5" strokeWidth={2} /> Approve
            </button>
            <button onClick={handleReject} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-rose/10 text-brand-rose text-xs font-medium lux-press hover:bg-brand-rose/20 transition-colors">
              <X className="size-3.5" strokeWidth={2} /> Reject
            </button>
            <button onClick={onClick} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-canvas text-ink/60 text-xs font-medium lux-press hover:bg-brand-cream transition-colors">
              <Pencil className="size-3.5" strokeWidth={1.5} /> Edit
            </button>
          </div>
        )}

        {/* Approved actions — show Publish button */}
        {post.status === "Approved" && !published && (
          <div className="flex gap-2 pt-1 border-t border-[#E5E0DB]">
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-brand-charcoal text-paper text-xs font-medium lux-press disabled:opacity-50 transition-colors"
            >
              {publishing ? (
                <><Loader2 className="size-3.5 animate-spin" /> Publishing...</>
              ) : (
                <><Send className="size-3.5" strokeWidth={2} /> Post to Instagram</>
              )}
            </button>
            <button onClick={onClick} className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-canvas text-ink/60 text-xs font-medium lux-press hover:bg-brand-cream transition-colors">
              <Pencil className="size-3.5" strokeWidth={1.5} /> Edit
            </button>
          </div>
        )}

        {/* Rejected actions */}
        {post.status === "Rejected" && !published && (
          <div className="flex gap-2 pt-1 border-t border-[#E5E0DB]">
            <button onClick={onClick} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-gold/10 text-brand-charcoal text-xs font-medium lux-press hover:bg-brand-gold/20 transition-colors">
              <Pencil className="size-3.5" strokeWidth={1.5} /> Revise with AI
            </button>
          </div>
        )}

        {/* Published state */}
        {(published || post.status === "Published") && (
          <div className="flex gap-2 pt-1 border-t border-[#E5E0DB]">
            <div className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-brand-sage/15 text-brand-charcoal text-xs font-medium">
              <Check className="size-3.5" strokeWidth={2} /> Live on Instagram
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
