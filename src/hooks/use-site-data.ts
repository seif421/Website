import { getRouteApi } from "@tanstack/react-router";
import { defaultSiteData, type SiteData } from "@/lib/store/content";

const root = getRouteApi("__root__");

/** Categories and website content, loaded once for the whole shop (see the root route). */
export function useSiteData(): SiteData {
  return (root.useLoaderData() as SiteData | undefined) ?? defaultSiteData();
}

/** Categories shown at the top level of menus. */
export function topCategories(data: SiteData) {
  return data.categories.filter((c) => !c.parentId);
}

/** The few categories shown in the header bar: the ones marked "featured", or the first five. */
export function navCategories(data: SiteData) {
  const top = topCategories(data);
  const featured = top.filter((c) => c.featured);
  return (featured.length > 0 ? featured : top).slice(0, 6);
}
