import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Download, Check } from "lucide-react";
import { PageShell } from "@/components/admin/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cjStatus, searchCj, importCjProduct, type SearchRow } from "@/lib/admin/cj-import";

export const Route = createFileRoute("/_authenticated/admin/cj")({
  component: CjPage,
});

const usd = (n: number) => `$${n.toFixed(2)}`;

function CjPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [keyword, setKeyword] = useState("");
  const [usOnly, setUsOnly] = useState(true);
  const [markup, setMarkup] = useState("100");
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  useEffect(() => {
    cjStatus().then((r) => setConnected(r.connected)).catch(() => setConnected(false));
  }, []);

  async function run(p: number) {
    if (!keyword.trim()) return;
    setSearching(true);
    try {
      const r = await searchCj({ data: { keyword, page: p, usOnly } });
      setRows(r.rows);
      setTotal(r.total);
      setPage(p);
      if (r.rows.length === 0) toast.info("No products found. Try another word, or untick the US filter.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function doImport(r: SearchRow) {
    setImporting(r.pid);
    try {
      const res = await importCjProduct({ data: { pid: r.pid, markupPct: Number(markup) } });
      setDone((d) => ({ ...d, [r.pid]: res.id }));
      toast.success(`Imported as a draft at ${usd(res.price)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  }

  return (
    <PageShell
      title="Import from CJ Dropshipping"
      description="Search CJ products and import them as drafts. You then review them in Products and publish."
      breadcrumbs={[{ label: "Admin", to: "/admin" }, { label: "CJ import" }]}
    >
      {connected === false && (
        <div className="rounded-lg border border-border bg-muted p-4 text-sm">
          CJ is not connected yet. Add your CJ API key as <code>CJ_API_KEY</code> in the Vercel settings, then redeploy.
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(1);
        }}
      >
        <div className="min-w-[240px] flex-1">
          <label className="text-sm font-medium" htmlFor="kw">Search</label>
          <Input id="kw" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. wifi camera, door sensor" />
        </div>
        <div className="w-32">
          <label className="text-sm font-medium" htmlFor="mk">Markup %</label>
          <Input id="mk" type="number" min={0} value={markup} onChange={(e) => setMarkup(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox checked={usOnly} onCheckedChange={(v) => setUsOnly(v === true)} /> Available for the US
        </label>
        <Button type="submit" disabled={searching || connected === false}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Search
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Your selling price = CJ price + markup, rounded to end in .99. CJ also charges shipping to the customer's address, which is paid by you. Your shop charges the customer the flat shipping set in Settings, so choose a markup that covers it.
      </p>

      {rows.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} results</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {rows.map((r) => {
              const price = Math.max(Math.ceil(r.cost * (1 + Number(markup || 0) / 100)) - 0.01, r.cost + 0.5);
              return (
                <div key={r.pid} className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
                  <div className="aspect-square bg-muted">
                    {r.image && <img src={r.image} alt="" loading="lazy" className="size-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="line-clamp-2 text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">CJ cost {usd(r.cost)} → your price {usd(price)}</p>
                    {done[r.pid] ? (
                      <Button asChild variant="outline" size="sm" className="mt-auto">
                        <Link to="/admin/products/$id" params={{ id: done[r.pid] }}><Check className="size-4" /> Imported — open</Link>
                      </Button>
                    ) : (
                      <Button size="sm" className="mt-auto" disabled={importing === r.pid} onClick={() => doImport(r)}>
                        {importing === r.pid ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Import as draft
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1 || searching} onClick={() => run(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button variant="outline" size="sm" disabled={searching || page * 20 >= total} onClick={() => run(page + 1)}>Next</Button>
          </div>
        </>
      )}
    </PageShell>
  );
}
