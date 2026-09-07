import { resolveMerchantFromWidget, isOriginAllowed } from "@/lib/security/widgetAuth";
import ChatWidget from "@/components/ChatWidget";

interface PageProps {
  params: Promise<{ widgetId: string }>;
  searchParams: Promise<{
    visitorSessionId?: string;
    parentOrigin?: string;
    host?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function HostedWidgetPage({
  params,
  searchParams,
}: PageProps) {
  const { widgetId } = await params;
  const { visitorSessionId, parentOrigin, host } = await searchParams;

  if (!widgetId) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Widget ID is required.
        </div>
      </div>
    );
  }

  // Resolve merchant tenant configuration server-side
  const resolved = await resolveMerchantFromWidget(widgetId);

  if (!resolved) {
    return (
      <div className="flex h-screen items-center justify-center p-4 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
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
        <div className="flex h-screen items-center justify-center p-4 text-center">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            Sales Pilot: Domain not authorized for this widget.
          </div>
        </div>
      );
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-transparent">
      <ChatWidget
        profileId={resolved.merchantId}
        aiName={resolved.settings.aiName}
        brandColor={resolved.settings.brandColor}
        welcomeMessage={resolved.settings.welcomeMessage}
        theme={resolved.settings.theme as "Light" | "Dark"}
        position={resolved.settings.position as "Bottom Right" | "Bottom Left"}
        size={resolved.settings.size as "Small" | "Medium" | "Large"}
        radius={resolved.settings.radius as "Square" | "Rounded" | "Pill"}
        autoOpen={resolved.settings.autoOpen}
        showTypingIndicator={resolved.settings.showTypingIndicator}
        soundNotifications={resolved.settings.soundNotifications}
        showAiAvatar={resolved.settings.showAiAvatar}
        collectVisitorName={resolved.settings.collectVisitorName}
        collectVisitorEmail={resolved.settings.collectVisitorEmail}
        enableAnimations={resolved.settings.enableAnimations}
        showPoweredBy={resolved.settings.showPoweredBy}
        initialVisitorSessionId={visitorSessionId}
      />
    </div>
  );
}
