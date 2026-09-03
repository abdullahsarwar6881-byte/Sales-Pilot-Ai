import WidgetPreview from "@/components/widget/WidgetPreview";

export const dynamic = "force-dynamic";

export default function WidgetPreviewTestPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md">
        <WidgetPreview
          profileId="3c321d7c-23e8-4101-9d30-1a2a8a0a37f9"
          aiName="Sales Pilot AI"
          welcomeMessage="Hi! How can I help you today?"
          brandColor="#6366F1"
          autoOpen={true}
          showTypingIndicator={true}
        />
      </div>
    </main>
  );
}
