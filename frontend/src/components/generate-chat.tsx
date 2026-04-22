import { useState, useRef, useEffect } from "react";
import { ImagePlus, Send, X, Loader2, Check, ChevronRight, Calendar, MessageSquare, Layers } from "lucide-react";
import { postsStore } from "@/lib/posts-store";

const API_BASE = "http://127.0.0.1:8000";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const POST_TYPES = [
  { id: "Product Showcase", label: "Product Showcase", desc: "Highlight individual pieces" },
  { id: "Educational", label: "Educational", desc: "Fabric guides, styling wisdom" },
  { id: "Catalogue", label: "Catalogue", desc: "Editorial collection shots" },
  { id: "Behind the Scenes", label: "Behind the Scenes", desc: "Brand story, process" },
  { id: "Styling Tips", label: "Styling Tips", desc: "How to wear, color pairing" },
];

type Step = "month" | "upload" | "brief" | "types" | "generating";

interface StepInfo {
  key: Step;
  label: string;
  icon: typeof Calendar;
}

const STEPS: StepInfo[] = [
  { key: "month", label: "Month", icon: Calendar },
  { key: "upload", label: "Upload", icon: ImagePlus },
  { key: "brief", label: "Brief", icon: MessageSquare },
  { key: "types", label: "Post types", icon: Layers },
];

export function GenerateChat({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedMonthLabel, setSelectedMonthLabel] = useState(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["Product Showcase", "Styling Tips"]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ step: "", percent: 0 });
  const [productIds, setProductIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [step, generating]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      setUploadedFiles((prev) => [...prev, f]);
      setUploadPreviews((prev) => [...prev, URL.createObjectURL(f)]);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const currentStepIndex = STEPS.findIndex((s) => s.key === step);

  const startGeneration = async () => {
    setStep("generating");
    setGenerating(true);
    setError("");

    try {
      // Step 1: Upload photos
      setProgress({ step: "Uploading photos...", percent: 10 });
      const formData = new FormData();
      uploadedFiles.forEach((file) => formData.append("images", file));

      const uploadRes = await fetch(`${API_BASE}/api/upload-photos`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.products?.length) {
        setError("Upload failed. Try again.");
        setGenerating(false);
        return;
      }

      const pids = uploadData.products.map((p: any) => p.id);
      setProductIds(pids);

      // Step 2: Generate content plan
      setProgress({ step: "Transforming photos into professional shoots...", percent: 30 });

      const genFormData = new FormData();
      genFormData.append("product_ids", JSON.stringify(pids));
      genFormData.append("brief", brief || "Balanced mix of content");
      genFormData.append("num_posts", String(pids.length));
      genFormData.append("month", selectedMonth);

      // Start progress animation
      let currentPercent = 30;
      const progressInterval = setInterval(() => {
        currentPercent = Math.min(currentPercent + 2, 90);
        if (currentPercent < 60) {
          setProgress({ step: "Transforming photos into professional shoots...", percent: currentPercent });
        } else if (currentPercent < 80) {
          setProgress({ step: "AI is writing captions for each garment...", percent: currentPercent });
        } else {
          setProgress({ step: "Building your content schedule...", percent: currentPercent });
        }
      }, 1000);

      const genRes = await fetch(`${API_BASE}/api/generate-content-plan`, {
        method: "POST",
        body: genFormData,
      });
      const genData = await genRes.json();

      clearInterval(progressInterval);

      if (genData.posts?.length > 0) {
        setProgress({ step: "Done! Your content plan is ready.", percent: 100 });

        const colors = ["gold", "blush", "sage", "rose", "cream", "charcoal"] as const;
        const mappedPosts = genData.posts.map((p: any, i: number) => ({
          id: p.id,
          image: `${API_BASE}/${p.image_path}`,
          caption: p.caption,
          type: p.post_type,
          platform: "Instagram" as const,
          status: "Draft" as const,
          scheduledFor: p.scheduled_for,
          color: colors[i % colors.length],
        }));

        setTimeout(() => {
          postsStore.setPostsDirectly(mappedPosts);
          onClose();
        }, 1200);
      } else {
        clearInterval(progressInterval);
        setError(genData.message || "Generation failed. Try again.");
        setGenerating(false);
      }
    } catch (err) {
      console.error(err);
      setError("Connection failed. Is the backend running?");
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-end md:items-center justify-center p-3 md:p-8">
      <div className="w-full max-w-2xl bg-paper rounded-2xl lux-border lux-shadow-xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 border-b border-[#E5E0DB] bg-brand-blush/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 bg-brand-gold/15 rounded-xl flex items-center justify-center">
              <span className="font-display text-brand-gold text-lg" style={{ fontWeight: 600 }}>A</span>
            </div>
            <div>
              <div className="font-display text-lg leading-tight text-brand-charcoal" style={{ fontWeight: 600 }}>Content Studio</div>
              <div className="text-xs text-muted-foreground">
                {step === "generating" ? "Creating your content..." : `Step ${currentStepIndex + 1} of ${STEPS.length}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="size-9 bg-paper rounded-full lux-border flex items-center justify-center lux-press">
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </header>

        {/* Progress bar */}
        {step !== "generating" && (
          <div className="px-6 py-3 border-b border-[#E5E0DB] bg-canvas/30">
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex-1 flex items-center gap-1">
                  <div className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= currentStepIndex ? "bg-brand-gold" : "bg-brand-cream"
                  }`} />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {STEPS.map((s, i) => (
                <span key={s.key} className={`text-[10px] uppercase tracking-wider ${
                  i <= currentStepIndex ? "text-brand-charcoal font-medium" : "text-muted-foreground"
                }`}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">

          {/* STEP: Month */}
          {step === "month" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-display text-xl text-brand-charcoal mb-1" style={{ fontWeight: 500 }}>
                  Which month is this for?
                </h3>
                <p className="text-sm text-muted-foreground">Select the month you want to schedule content for.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => {
                  const year = new Date().getFullYear();
                  const val = `${year}-${String(i + 1).padStart(2, "0")}`;
                  const isSelected = selectedMonth === val;
                  return (
                    <button
                      key={m}
                      onClick={() => { setSelectedMonth(val); setSelectedMonthLabel(`${m} ${year}`); }}
                      className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-brand-charcoal text-paper"
                          : "bg-canvas lux-border hover:bg-brand-cream/50"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Upload */}
          {step === "upload" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-display text-xl text-brand-charcoal mb-1" style={{ fontWeight: 500 }}>
                  Upload your product photos
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload raw product images. AI will transform each into a professional shoot.
                </p>
              </div>

              <label className="border-2 border-dashed border-brand-gold/30 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-brand-gold/5 transition-colors">
                <ImagePlus className="size-8 text-brand-gold/60" strokeWidth={1.5} />
                <span className="text-sm text-muted-foreground">Click to upload or drag photos here</span>
                <span className="text-xs text-muted-foreground">JPG, PNG — up to 10 photos</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
              </label>

              {uploadPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {uploadPreviews.map((u, i) => (
                    <div key={i} className="relative aspect-square rounded-xl lux-border overflow-hidden bg-canvas group">
                      <img src={u} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 size-6 bg-ink/60 text-paper rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {uploadPreviews.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-brand-charcoal">
                  <Check className="size-4 text-brand-sage" strokeWidth={2} />
                  {uploadPreviews.length} photo{uploadPreviews.length > 1 ? "s" : ""} ready
                </div>
              )}
            </div>
          )}

          {/* STEP: Brief */}
          {step === "brief" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-display text-xl text-brand-charcoal mb-1" style={{ fontWeight: 500 }}>
                  Describe your vision
                </h3>
                <p className="text-sm text-muted-foreground">
                  Any special themes, promotions, or aesthetic direction for {selectedMonthLabel}?
                </p>
              </div>

              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="e.g. Monsoon collection launch, focus on breathable fabrics, elegant and minimal tone, highlight the embroidery work..."
                className="w-full bg-canvas lux-border rounded-xl p-4 text-sm leading-relaxed resize-none placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/30"
              />

              <div className="flex flex-wrap gap-2">
                {["Monsoon collection", "Festival season", "Casual everyday", "Wedding wear", "New arrivals"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setBrief((prev) => prev ? `${prev}, ${tag.toLowerCase()}` : tag.toLowerCase())}
                    className="px-3 py-1.5 rounded-lg bg-canvas lux-border text-xs font-medium text-muted-foreground hover:bg-brand-cream/50 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: Post Types */}
          {step === "types" && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-display text-xl text-brand-charcoal mb-1" style={{ fontWeight: 500 }}>
                  What types of posts?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select the content mix you'd like. AI will balance them across the month.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {POST_TYPES.map((type) => {
                  const isSelected = selectedTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-brand-gold/10 lux-border-accent"
                          : "bg-canvas lux-border hover:bg-brand-cream/30"
                      }`}
                    >
                      <div className={`size-5 rounded flex items-center justify-center ${
                        isSelected ? "bg-brand-gold text-paper" : "bg-paper lux-border"
                      }`}>
                        {isSelected && <Check className="size-3" strokeWidth={3} />}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-brand-charcoal">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP: Generating */}
          {step === "generating" && (
            <div className="flex flex-col items-center justify-center gap-6 py-8">
              <div className="size-16 bg-brand-gold/10 rounded-2xl flex items-center justify-center">
                <Loader2 className="size-8 text-brand-gold animate-spin" strokeWidth={1.5} />
              </div>

              <div className="text-center">
                <h3 className="font-display text-xl text-brand-charcoal mb-2" style={{ fontWeight: 500 }}>
                  Creating your content plan
                </h3>
                <p className="text-sm text-muted-foreground mb-1">{progress.step}</p>
                <p className="text-xs text-muted-foreground">This takes 30-60 seconds per photo</p>
              </div>

              <div className="w-full max-w-sm">
                <div className="h-2 bg-brand-cream rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-gold rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <div className="text-right text-xs text-muted-foreground mt-1">{progress.percent}%</div>
              </div>

              {error && (
                <div className="bg-brand-rose/10 lux-border rounded-xl px-4 py-3 text-sm text-brand-rose">
                  {error}
                  <button
                    onClick={() => { setStep("upload"); setGenerating(false); setError(""); }}
                    className="ml-2 underline"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        {step !== "generating" && (
          <div className="p-4 border-t border-[#E5E0DB] bg-paper flex items-center justify-between gap-3">
            {step !== "month" ? (
              <button
                onClick={() => {
                  const idx = currentStepIndex;
                  if (idx > 0) setStep(STEPS[idx - 1].key);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-canvas transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step === "types" ? (
              <button
                onClick={startGeneration}
                disabled={uploadedFiles.length === 0 || selectedTypes.length === 0}
                className="px-6 py-2.5 bg-brand-charcoal text-paper rounded-xl lux-press font-medium text-sm flex items-center gap-2 disabled:opacity-40"
              >
                Generate content plan
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                onClick={() => {
                  const idx = currentStepIndex;
                  if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
                }}
                disabled={step === "upload" && uploadedFiles.length === 0}
                className="px-6 py-2.5 bg-brand-charcoal text-paper rounded-xl lux-press font-medium text-sm flex items-center gap-2 disabled:opacity-40"
              >
                Next
                <ChevronRight className="size-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
