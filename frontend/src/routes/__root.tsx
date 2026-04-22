import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AppShell } from "@/components/app-shell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center bg-paper rounded-3xl pop-border-thick pop-shadow-lg p-10">
        <h1 className="text-7xl font-black text-ink">404</h1>
        <h2 className="mt-4 text-xl font-black text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-ink/60 font-medium">
          That route doesn't exist on this campaign.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-paper pop-border pop-shadow-sm pop-press"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Kite — Agentic social media for small businesses" },
      {
        name: "description",
        content:
          "Upload your photos, chat with AI, and let Kite draft, schedule, and post your content for the month.",
      },
      { property: "og:title", content: "Kite — Agentic social media for small businesses" },
      {
        property: "og:description",
        content:
          "Upload your photos, chat with AI, and let Kite draft, schedule, and post your content for the month.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <AppShell />;
}
