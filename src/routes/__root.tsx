import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { trackPageView } from "@/lib/store/track";
import { CartProvider } from "@/hooks/use-cart";
import { WishlistProvider } from "@/hooks/use-wishlist";
import { defaultSiteData, fetchSiteData, type SiteData } from "@/lib/store/content";
import { imageUrl } from "@/lib/store/format";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { getLang } from "@/lib/i18n/lang";
import { fillArabic } from "@/lib/store/arabic";

function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{t("Page not found")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("The page you're looking for doesn't exist or has been moved.")}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("Go home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

// After a website update, a tab that was already open can ask for old files that no longer exist.
// Reloading once fetches the new version, so the visitor never sees the error page for that.
const STALE_FILE_ERROR =
  /dynamically imported module|importing a module script|loading chunk|loading css chunk|failed to fetch/i;

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error ?? "");
  useEffect(() => {
    if (!STALE_FILE_ERROR.test(message)) return;
    try {
      if (sessionStorage.getItem("rivvo_reloaded") === "1") return;
      sessionStorage.setItem("rivvo_reloaded", "1");
    } catch {
      return;
    }
    window.location.reload();
  }, [message]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {message ? (
          <p className="mt-3 break-words rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
            {message.slice(0, 300)}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async () => ({ lang: await getLang() }),
  loader: () => fetchSiteData(),
  staleTime: 30_000,
  head: ({ loaderData }) => {
    const brand = (loaderData as SiteData | undefined)?.brand ?? defaultSiteData().brand;
    const og = imageUrl(brand.ogImage);
    const icon = imageUrl(brand.favicon);
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: brand.seoTitle },
        { name: "description", content: brand.seoDescription },
        { name: "author", content: brand.name },
        { property: "og:title", content: brand.seoTitle },
        { property: "og:description", content: brand.seoDescription },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: brand.name },
        ...(og ? [{ property: "og:image", content: og }] : []),
        { name: "twitter:card", content: og ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: brand.seoTitle },
        { name: "twitter:description", content: brand.seoDescription },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        ...(icon ? [{ rel: "icon", href: icon }] : []),
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
        },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const { lang: chosen } = Route.useRouteContext();
  const inAdmin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  const lang = inAdmin ? "en" : chosen;
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
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

// Counts shop visits for the admin Analytics. Admin pages and staff browsing the shop are not counted.
function PageTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { loading, isStaff } = useAuth();
  useEffect(() => {
    if (loading || isStaff || pathname.startsWith("/admin")) return;
    trackPageView(pathname);
  }, [pathname, loading, isStaff]);
  return null;
}

// Translates new or edited products and categories into Arabic in the background.
// Visitors in Arabic trigger one pass; the admin keeps going until everything is done.
function ArabicFiller({ lang }: { lang: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const inAdmin = pathname.startsWith("/admin");
  useEffect(() => {
    if (!inAdmin && lang !== "ar") return;
    let stop = false;
    (async () => {
      for (let i = 0; i < (inAdmin ? 40 : 1) && !stop; i++) {
        try {
          const r = await fillArabic();
          if (r.done === 0 && r.left === 0) return;
        } catch {
          return;
        }
        await new Promise((res) => setTimeout(res, 16000));
      }
    })();
    return () => {
      stop = true;
    };
  }, [inAdmin, lang]);
  return null;
}

function RootComponent() {
  const { queryClient, lang } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initial={lang}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <PageTracker />
          <ArabicFiller lang={lang} />
          <Toaster richColors position="top-right" />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
