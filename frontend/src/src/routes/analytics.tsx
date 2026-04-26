import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { TrendingUp, Heart, MessageCircle, Bookmark, Eye, Award, Calendar, Clock, Sparkles, Trophy } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/analytics`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  const hasData = data && data.total_posts > 0;
  const totals = data?.totals || {};
  const dailyData = Object.entries(data?.daily_trend || {}).sort(([a], [b]) => a.localeCompare(b));
  const maxDaily = Math.max(...(dailyData.map(([, v]: any) => v) as number[]), 1);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-brand-blush/60 rounded-2xl lux-border lux-shadow p-5 md:p-7 mb-5 shrink-0">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Performance insights
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-brand-charcoal" style={{ fontWeight: 500 }}>
          Engagement Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Live data from your Instagram posts. Used by AI to optimize future scheduling.
        </p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="size-14 bg-brand-gold/10 lux-border rounded-2xl mx-auto flex items-center justify-center mb-5">
              <TrendingUp className="size-6 text-brand-gold" strokeWidth={1.5} />
            </div>
            <h2 className="font-display text-xl text-brand-charcoal mb-2" style={{ fontWeight: 500 }}>
              No analytics yet
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Publish a few posts to start seeing engagement data.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-12 flex flex-col gap-4">
          {/* Totals */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">Last 30 days totals</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard icon={Heart} label="Likes" value={totals.likes} bg="bg-brand-rose/15" iconColor="text-brand-rose" />
              <StatCard icon={MessageCircle} label="Comments" value={totals.comments} bg="bg-brand-sage/15" iconColor="text-brand-sage" />
              <StatCard icon={Bookmark} label="Saves" value={totals.saves} bg="bg-brand-gold/15" iconColor="text-brand-gold" />
              <StatCard icon={Eye} label="Reach" value={totals.reach} bg="bg-brand-cream" iconColor="text-brand-charcoal" />
              <StatCard icon={Eye} label="Views" value={totals.views} bg="bg-brand-blush" iconColor="text-brand-rose" />
            </div>
          </div>

          {/* Engagement Trend */}
<div className="bg-paper lux-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="size-4 text-brand-gold" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Engagement trend (last 7 days)</div>
            </div>
            {dailyData.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No engagement data yet</div>
            ) : (
              <div className="relative h-48 mt-4">
                <svg viewBox="0 0 700 180" className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="40" y1={20 + i * 40} x2="680" y2={20 + i * 40} stroke="#E5E0DB" strokeWidth="0.5" />
                  ))}
                  
                  {/* Y axis labels */}
                  {[0, 1, 2, 3].map((i) => (
                    <text key={i} x="35" y={25 + i * 40} textAnchor="end" fill="#8A8A85" fontSize="10">
                      {Math.round(maxDaily * (3 - i) / 3)}
                    </text>
                  ))}
                  
                  {/* Line path */}
                  <polyline
                    fill="none"
                    stroke="#C5A572"
                    strokeWidth="2"
                    points={dailyData.map(([, score]: any, i) => {
                      const x = 40 + (640 / 6) * i;
                      const y = 140 - ((score / maxDaily) * 120);
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  
                  {/* Area fill */}
                  <polygon
                    fill="url(#gradient)"
                    opacity="0.3"
                    points={`40,140 ${dailyData.map(([, score]: any, i) => {
                      const x = 40 + (640 / 6) * i;
                      const y = 140 - ((score / maxDaily) * 120);
                      return `${x},${y}`;
                    }).join(' ')} 680,140`}
                  />
                  
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#C5A572" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#C5A572" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Data points */}
                  {dailyData.map(([date, score]: any, i) => {
                    const x = 40 + (640 / 6) * i;
                    const y = 140 - ((score / maxDaily) * 120);
                    return (
                      <g key={date}>
                        <circle cx={x} cy={y} r="4" fill="#C5A572" />
                        <text x={x} y={y - 10} textAnchor="middle" fill="#2C2C2C" fontSize="11" fontWeight="bold">
                          {score}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* X axis labels */}
                  {dailyData.map(([date]: any, i) => {
                    const x = 40 + (640 / 6) * i;
                    const d = new Date(date);
                    const label = `${d.getDate()}/${d.getMonth() + 1}`;
                    return (
                      <text key={date} x={x} y="170" textAnchor="middle" fill="#8A8A85" fontSize="10">
                        {label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            )}
          </div>

          {/* Best metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-brand-gold/10 lux-border rounded-2xl p-5">
              <Award className="size-5 text-brand-gold mb-2" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Best post type</div>
              <div className="font-display text-xl text-brand-charcoal" style={{ fontWeight: 500 }}>
                {data.best_post_type || "—"}
              </div>
            </div>
            <div className="bg-brand-sage/15 lux-border rounded-2xl p-5">
              <Calendar className="size-5 text-brand-sage mb-2" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Best day</div>
              <div className="font-display text-xl text-brand-charcoal" style={{ fontWeight: 500 }}>
                {data.best_day || "—"}
              </div>
            </div>
            <div className="bg-brand-blush lux-border rounded-2xl p-5">
              <Clock className="size-5 text-brand-rose mb-2" strokeWidth={1.5} />
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Best time</div>
              <div className="font-display text-xl text-brand-charcoal" style={{ fontWeight: 500 }}>
                {data.best_time !== null ? `${data.best_time}:00` : "—"}
              </div>
            </div>
          </div>

          {/* Top 3 Posts */}
          {data.top_posts && data.top_posts.length > 0 && (
            <div className="bg-paper lux-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="size-4 text-brand-gold" strokeWidth={1.5} />
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Top 3 performing posts</div>
              </div>
              <div className="flex flex-col gap-3">
                {data.top_posts.map((post: any, i: number) => (
                  <div key={post.id} className="flex items-center gap-3 p-3 bg-canvas rounded-xl">
                    <div className="size-8 rounded-full bg-brand-gold/20 flex items-center justify-center font-display text-brand-gold font-bold">
                      {i + 1}
                    </div>
                    {post.image && (
                      <img src={post.image} alt="" className="size-14 rounded-lg object-cover lux-border" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-brand-charcoal mb-0.5">{post.post_type}</div>
                      <div className="text-xs text-muted-foreground truncate">{post.caption}</div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Heart className="size-3 text-brand-rose" strokeWidth={1.5} />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="size-3 text-brand-sage" strokeWidth={1.5} />
                        <span>{post.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bookmark className="size-3 text-brand-gold" strokeWidth={1.5} />
                        <span>{post.saved}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* By type breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-paper lux-border rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Engagement by post type</div>
              <div className="flex flex-col gap-2">
                {Object.entries(data.by_post_type || {}).map(([type, score]: any) => (
                  <div key={type} className="flex items-center gap-3">
                    <div className="text-xs font-medium text-brand-charcoal w-32 truncate">{type}</div>
                    <div className="flex-1 bg-brand-cream rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-brand-gold rounded-full" style={{ width: `${Math.min(100, score * 10)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground w-12 text-right">{score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-paper lux-border rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Engagement by day</div>
              <div className="flex flex-col gap-2">
                {Object.entries(data.by_day || {}).map(([day, score]: any) => (
                  <div key={day} className="flex items-center gap-3">
                    <div className="text-xs font-medium text-brand-charcoal w-24">{day}</div>
                    <div className="flex-1 bg-brand-cream rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-brand-sage rounded-full" style={{ width: `${Math.min(100, score * 10)}%` }} />
                    </div>
                    <div className="text-xs text-muted-foreground w-12 text-right">{score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Learning footer */}
          <div className="bg-brand-charcoal text-paper rounded-2xl p-5 flex items-start gap-3">
            <Sparkles className="size-5 text-brand-gold shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <div className="font-medium text-sm mb-1">AI Learning Active</div>
              <div className="text-xs opacity-70 leading-relaxed">
                Based on {data.total_posts} published posts, the AI uses these performance patterns to schedule new content. The more you publish, the smarter it gets.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, bg, iconColor }: any) {
  return (
    <div className={`${bg} lux-border rounded-xl p-4`}>
      <Icon className={`size-4 ${iconColor} mb-2`} strokeWidth={1.5} />
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">{label}</div>
      <div className="font-display text-2xl text-brand-charcoal" style={{ fontWeight: 500 }}>
        {value || 0}
      </div>
    </div>
  );
}