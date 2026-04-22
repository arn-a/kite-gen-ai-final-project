import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { usePostsStore, postsStore } from "@/lib/posts-store";
import { PostPreviewModal } from "@/components/post-preview-modal";
import type { Post } from "@/lib/posts-data";

export const Route = createFileRoute("/schedule")({
  component: SchedulePage,
});

const colorMap: Record<Post["color"], string> = {
  gold: "bg-brand-gold/20 text-brand-charcoal",
  blush: "bg-brand-blush text-brand-charcoal",
  sage: "bg-brand-sage/25 text-brand-charcoal",
  rose: "bg-brand-rose/20 text-brand-charcoal",
  cream: "bg-brand-cream text-brand-charcoal",
  charcoal: "bg-brand-charcoal/10 text-brand-charcoal",
};

function SchedulePage() {
  const { posts, generated } = usePostsStore();
  const [cursor, setCursor] = useState(() => new Date());
  const [previewPost, setPreviewPost] = useState<Post | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const p of posts) {
      const key = format(new Date(p.scheduledFor), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return map;
  }, [posts]);

  const handleDrop = (day: Date) => {
    if (!draggedId) return;
    const p = posts.find((pp) => pp.id === draggedId);
    if (!p) return;
    const old = new Date(p.scheduledFor);
    const next = new Date(day);
    next.setHours(old.getHours(), old.getMinutes(), 0, 0);
    postsStore.reschedule(draggedId, next.toISOString());
    setDraggedId(null);
    setDragOverDay(null);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-brand-charcoal rounded-2xl lux-shadow-lg p-5 md:p-6 mb-5 flex items-center justify-between gap-3 shrink-0 text-paper">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] mb-1 opacity-60">Schedule</div>
            <h1 className="font-display text-2xl md:text-3xl" style={{ fontWeight: 500 }}>
              {format(cursor, "MMMM yyyy")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(subMonths(cursor, 1))} className="size-10 bg-paper/10 text-paper rounded-xl lux-press flex items-center justify-center hover:bg-paper/20">
              <ChevronLeft className="size-5" strokeWidth={1.5} />
            </button>
            <button onClick={() => setCursor(new Date())} className="bg-paper text-brand-charcoal lux-press font-medium text-sm px-4 h-10 rounded-xl">
              Today
            </button>
            <button onClick={() => setCursor(addMonths(cursor, 1))} className="size-10 bg-paper/10 text-paper rounded-xl lux-press flex items-center justify-center hover:bg-paper/20">
              <ChevronRight className="size-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {!generated ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="size-14 bg-brand-gold/10 lux-border rounded-2xl mx-auto flex items-center justify-center mb-5">
                <Sparkles className="size-6 text-brand-gold" strokeWidth={1.5} />
              </div>
              <h2 className="font-display text-xl text-brand-charcoal mb-2" style={{ fontWeight: 500 }}>No posts scheduled</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                Head to Content and create your first batch.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-paper rounded-2xl lux-border lux-shadow overflow-hidden flex flex-col min-h-0">
            <div className="grid grid-cols-7 border-b border-[#E5E0DB] shrink-0">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-3 py-2.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground border-r border-[#E5E0DB] last:border-r-0 bg-canvas/50 font-medium">
                  {d}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
              {days.map((day, i) => {
                const key = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, cursor);
                const dayPosts = postsByDay.get(key) ?? [];
                const today_ = isToday(day);
                const isDragOver = dragOverDay === key;
                const rowEnd = (i + 1) % 7 === 0;

                return (
                  <div
                    key={key}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDay(key); }}
                    onDragLeave={() => setDragOverDay((d) => (d === key ? null : d))}
                    onDrop={() => handleDrop(day)}
                    className={[
                      "min-h-[100px] border-b border-[#E5E0DB] p-2 flex flex-col gap-1 transition-colors",
                      rowEnd ? "" : "border-r border-[#E5E0DB]",
                      inMonth ? "bg-paper" : "bg-canvas/30",
                      isDragOver ? "bg-brand-gold/10" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className={today_
                        ? "size-7 bg-brand-gold text-paper rounded-lg flex items-center justify-center font-medium text-xs"
                        : "px-1 font-medium text-xs " + (inMonth ? "text-ink" : "text-ink/25")
                      }>
                        {format(day, "d")}
                      </div>
                      {dayPosts.length > 0 && (
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                          {dayPosts.length} post{dayPosts.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayPosts.map((p) => (
                        <button
                          key={p.id}
                          draggable
                          onDragStart={() => setDraggedId(p.id)}
                          onDragEnd={() => { setDraggedId(null); setDragOverDay(null); }}
                          onClick={() => setPreviewPost(p)}
                          className={`text-left rounded-lg lux-border px-2 py-1.5 ${colorMap[p.color]} lux-press cursor-grab active:cursor-grabbing`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <div className="size-4 rounded overflow-hidden border border-ink/10 shrink-0">
                              <img src={p.image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[9px] uppercase tracking-wider truncate font-medium">{p.type}</span>
                          </div>
                          <div className="text-[10px] leading-tight line-clamp-2">{p.caption}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground text-center shrink-0">
          Drag posts between days to reschedule
        </div>
      </div>

      <PostPreviewModal post={previewPost} onClose={() => setPreviewPost(null)} />
    </>
  );
}
