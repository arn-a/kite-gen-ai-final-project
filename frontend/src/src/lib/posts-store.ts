import { useSyncExternalStore } from "react";
import type { Post } from "./posts-data";

const API_BASE = "http://127.0.0.1:8000";

type State = {
  generated: boolean;
  posts: Post[];
  loading: boolean;
  brief: string;
};

let state: State = { generated: false, posts: [], loading: false, brief: "" };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  emit();
}

// Load saved posts from backend on startup
async function loadFromBackend() {
  try {
    const res = await fetch(`${API_BASE}/api/posts`);
    const data = await res.json();
    if (data.posts && data.posts.length > 0) {
      const colors = ["gold", "blush", "sage", "rose", "cream", "charcoal"] as const;
      const mapped: Post[] = data.posts.map((p: any, i: number) => ({
        id: p.id,
        image: p.cloudinary_url || `${API_BASE}/${p.image_path}`,
        caption: p.caption,
        publishedAt: p.published_at,
        type: p.post_type as Post["type"],
        platform: "Instagram" as const,
        status: p.status === "draft" ? "Draft" : p.status === "approved" ? "Approved" : p.status === "rejected" ? "Rejected" : p.status === "published" ? "Published" : "Draft",
        scheduledFor: p.scheduled_for,
        color: (p.color as Post["color"]) || colors[i % colors.length],
      }));
      setState({ generated: true, posts: mapped });
    }
  } catch (err) {
    console.log("No backend data found, starting fresh");
  }
}

// Auto-load on startup
loadFromBackend();

export const postsStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): State {
    return state;
  },

  setPostsDirectly(posts: Post[]) {
    setState({ generated: true, posts, loading: false });
  },

  generate(brief?: string) {
    setState({ loading: true, brief: brief || state.brief });
    setTimeout(() => {
      loadFromBackend();
      setState({ loading: false });
    }, 1800);
  },

  reset() {
    setState({ generated: false, posts: [], loading: false, brief: "" });
  },

  updatePost(id: string, patch: Partial<Post>) {
    setState({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  },

  async approvePost(id: string) {
    try {
      await fetch(`${API_BASE}/api/posts/${id}/approve`, { method: "PUT" });
    } catch {}
    this.updatePost(id, { status: "Approved" });
  },

  async rejectPost(id: string) {
    try {
      await fetch(`${API_BASE}/api/posts/${id}/reject`, { method: "PUT" });
    } catch {}
    this.updatePost(id, { status: "Rejected" });
  },

  schedulePost(id: string) {
    this.updatePost(id, { status: "Scheduled" });
  },

  reschedule(id: string, isoDate: string) {
    this.updatePost(id, { scheduledFor: isoDate });
    try {
      fetch(`${API_BASE}/api/posts/${id}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `scheduled_for=${encodeURIComponent(isoDate)}`,
      });
    } catch {}
  },

  async editCaptionWithAI(postId: string, instruction: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("instruction", instruction);
      const res = await fetch(`${API_BASE}/api/posts/${postId}/edit`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.post?.caption) {
        postsStore.updatePost(postId, { caption: data.post.caption });
        return data.post.caption;
      }
      return "";
    } catch {
      return "";
    }
  },

  async publishToInstagram(postId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.instagram_id || data.message?.includes("Published")) {
        postsStore.updatePost(postId, { status: "Published" });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};

export function usePostsStore() {
  return useSyncExternalStore(
    postsStore.subscribe,
    postsStore.getSnapshot,
    postsStore.getSnapshot
  );
}