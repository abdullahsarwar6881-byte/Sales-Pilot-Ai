import { resolveMerchantFromWidget, isOriginAllowed } from "@/lib/security/widgetAuth";
import EmbeddedAgentConsole from "@/components/console/EmbeddedAgentConsole";

interface PageProps {
  params: Promise<{ widgetId: string }>;
  searchParams: Promise<{
    parentOrigin?: string;
    host?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function EmbeddedWidgetConsolePage({
  params,
  searchParams,
}: PageProps) {
  const { widgetId } = await params;
  const { parentOrigin, host } = await searchParams;

  if (!widgetId) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          Widget ID is required.
        </div>
      </div>
    );
  }

  // Resolve merchant tenant configuration server-side
  const resolved = await resolveMerchantFromWidget(widgetId);

  if (!resolved) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center bg-slate-950 text-white">
        <div className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
          Sales Pilot: Widget not found or inactive.
        </div>
      </div>
    );
  }

  // Validate embedding parent domain if provided
  const originToCheck = parentOrigin || host || null;
  if (originToCheck) {
    const { allowed } = isOriginAllowed(originToCheck, resolved.allowedDomains);
    if (!allowed) {
      return (
        <div className="flex h-screen items-center justify-center p-4 text-center bg-slate-950 text-white">
          <div className="rounded-2xl border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300">
            Sales Pilot: Domain not authorized for this widget console.
          </div>
        </div>
      );
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <EmbeddedAgentConsole
        widgetId={widgetId}
        isEmbedded={true}
      />
    </div>
  );
}

