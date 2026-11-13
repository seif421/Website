import { home } from "./home";
import { shop } from "./shop";
import { account } from "./account";
import { pages } from "./pages";

/** English sentence -> Arabic. Each file belongs to one part of the site. */
export const ar: Record<string, string> = { ...home, ...shop, ...account, ...pages };
