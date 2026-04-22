import { useSyncExternalStore } from "react";
import { seedPosts, type Post } from "./posts-data";

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

export const postsStore = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): State {
    return state;
  },

  // Set posts directly from AI-generated data
  setPostsDirectly(posts: Post[]) {
    setState({ generated: true, posts, loading: false });
  },

  // Fallback: use seed data for demo
  generate(brief?: string) {
    setState({ loading: true, brief: brief || state.brief });
    setTimeout(() => {
      setState({ generated: true, posts: seedPosts, loading: false });
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

  approvePost(id: string) {
    this.updatePost(id, { status: "Approved" });
  },

  rejectPost(id: string) {
    this.updatePost(id, { status: "Rejected" });
  },

  schedulePost(id: string) {
    this.updatePost(id, { status: "Scheduled" });
  },

  reschedule(id: string, isoDate: string) {
    this.updatePost(id, { scheduledFor: isoDate });
  },

  // Edit caption via backend AI
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
    } catch (err) {
      console.error("AI edit failed:", err);
      return "";
    }
  },

  // Publish to Instagram via backend
  async publishToInstagram(postId: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/posts/${postId}/publish`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.instagram_id) {
        postsStore.updatePost(postId, { status: "Published" });
        return true;
      }
      return false;
    } catch (err) {
      console.error("Publish failed:", err);
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
