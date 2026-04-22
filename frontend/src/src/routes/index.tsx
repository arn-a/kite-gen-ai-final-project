import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Plus, RotateCcw } from "lucide-react";
import { usePostsStore, postsStore } from "@/lib/posts-store";
import { GenerateChat } from "@/components/generate-chat";
import { PostCard } from "@/components/post-card";
import { PostPreviewModal } from "@/components/post-preview-modal";
import type { Post } from "@/lib/posts-data";

export const Route = createFileRoute("/")({
  component: ContentPage,
});

function ContentPage() {
  const { generated, posts, loading, brief } = usePostsStore();
  const [showChat, setShowChat] = useState(false);
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const filteredPosts = filter === "All" ? posts : posts.filter((p) => p.status === filter);

  const stats = {
    total: posts.length,
    approved: posts.filter((p) => p.status === "Approved").length,
    draft: posts.filter((p) => p.status === "Draft").length,
    rejected: posts.filter((p) => p.status === "Rejected").length,
    scheduled: posts.filter((p) => p.status === "Scheduled").length,
    published: posts.filter((p) => p.status === "Published").length,
  };

  if (!generated) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="max-w-xl w-full text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-paper lux-border rounded-full text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8 lux-shadow-sm">
              <span className="size-1.5 rounded-full bg-brand-sage animate-pulse" />
              Ready to create
            </div>

            <h1 className="font-display text-4xl md:text-5xl text-brand-charcoal leading-[1.1] mb-5" style={{ fontWeight: 500 }}>
              Plan this month's{" "}
              <span className="text-brand-gold italic">content</span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto mb-10 leading-relaxed">
              Upload your product photos, describe the aesthetic,
              and let AI draft captions and schedule your posts.
            </p>

            <button
              onClick={() => setShowChat(true)}
              className="group inline-flex items-center gap-3 bg-brand-charcoal text-paper lux-press px-8 py-4 rounded-xl font-medium text-base"
            >
              <Sparkles className="size-5" strokeWidth={1.5} />
              Create content plan
            </button>

            <div className="mt-14 grid grid-cols-4 gap-4 max-w-lg mx-auto">
              {[
                { bg: "bg-brand-blush", label: "Month", step: "01" },
                { bg: "bg-brand-cream", label: "Upload", step: "02" },
                { bg: "bg-brand-sage/20", label: "Brief", step: "03" },
                { bg: "bg-brand-gold/15", label: "Generate", step: "04" },
              ].map((s) => (
                <div key={s.step} className={`${s.bg} lux-border rounded-xl p-4 lux-shadow-sm`}>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{s.step}</div>
                  <div className="font-medium text-sm text-brand-charcoal">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {showChat && <GenerateChat onClose={() => setShowChat(false)} />}
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hero strip */}
        <div className="bg-brand-blush/60 rounded-2xl lux-border lux-shadow p-5 md:p-7 mb-5 relative overflow-hidden shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                This month's plan
              </div>
              <h1 className="font-display text-2xl md:text-3xl text-brand-charcoal" style={{ fontWeight: 500 }}>
                {posts.length} posts curated
              </h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowChat(true)}
                className="bg-paper lux-border lux-shadow-sm lux-press font-medium text-sm px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Plus className="size-4" strokeWidth={1.5} />
                Add posts
              </button>
              <button
                onClick={() => postsStore.reset()}
                className="bg-brand-charcoal text-paper lux-press font-medium text-sm px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <RotateCcw className="size-3.5" strokeWidth={1.5} />
                Start over
              </button>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Draft", count: stats.draft, bg: "bg-brand-cream" },
              { label: "Approved", count: stats.approved, bg: "bg-brand-sage/20" },
              { label: "Rejected", count: stats.rejected, bg: "bg-brand-rose/15" },
              { label: "Published", count: stats.published, bg: "bg-brand-charcoal/10" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} lux-border rounded-lg px-3 py-1.5 text-xs font-medium`}>
                {s.count} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {["All", "Draft", "Approved", "Rejected", "Published"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-brand-charcoal text-paper"
                  : "bg-paper lux-border text-muted-foreground hover:bg-brand-cream/50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div className="flex-1 overflow-y-auto pb-12 -mx-1 px-1">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPosts.map((p) => (
              <PostCard key={p.id} post={p} onClick={() => setPreviewPost(p)} />
            ))}
          </div>
          {filteredPosts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No {filter.toLowerCase()} posts yet.
            </div>
          )}
        </div>
      </div>

      {showChat && <GenerateChat onClose={() => setShowChat(false)} />}
      <PostPreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />
    </>
  );
}
