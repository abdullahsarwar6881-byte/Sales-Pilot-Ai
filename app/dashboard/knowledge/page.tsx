"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

import KnowledgeStats from "@/components/knowledge/KnowledgeStats";
import UploadCard from "@/components/knowledge/UploadCard";
import WebsiteCard from "@/components/knowledge/WebsiteCard";
import DocumentList from "@/components/knowledge/DocumentList";
import { type CrawlJobRecord } from "@/components/knowledge/CrawlProgressCard";

export default function KnowledgePage() {
  const supabase = createClient();

  const [urlInput, setUrlInput] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [pages, setPages] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [connected, setConnected] = useState(false);

  // Profile ID used by the widget installation code and Realtime subscription
  const [profileId, setProfileId] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Persistent crawl job state
  const [activeCrawlJob, setActiveCrawlJob] = useState<CrawlJobRecord | null>(null);

  // --------------------------------
  // LOAD KNOWLEDGE
  // --------------------------------

  const loadKnowledge = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setProfileId(user.id);

    const [
      documentsData,
      pagesData,
      chunksData,
      urlsData,
      latestCrawlData,
    ] = await Promise.all([
      supabase
        .from("knowledge_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("knowledge_pages")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id),

      supabase
        .from("knowledge_chunks")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("user_id", user.id),

      supabase
        .from("knowledge_urls")
        .select("*")
        .eq("user_id", user.id),

      supabase
        .from("crawl_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    setDocuments(documentsData.data || []);
    setPages(pagesData.count || 0);
    setChunks(chunksData.count || 0);
    setConnected((urlsData.data?.length || 0) > 0);

    if (latestCrawlData.data && latestCrawlData.data.length > 0) {
      const latestJob = latestCrawlData.data[0] as CrawlJobRecord;
      setActiveCrawlJob(latestJob);

      // Populate URL input if empty
      const targetUrl = latestJob.url || latestJob.website_url;
      if (targetUrl) {
        setUrlInput((prev) => (prev ? prev : targetUrl));
      }
    }
  }, [supabase]);

  useEffect(() => {
    loadKnowledge();
  }, [loadKnowledge]);

  // --------------------------------
  // SUPABASE REALTIME SUBSCRIPTION
  // --------------------------------

  useEffect(() => {
    if (!profileId) return;

    // Register .on() callbacks BEFORE calling .subscribe()
    const channel = supabase
      .channel(`crawl_jobs_user_${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crawl_jobs",
          filter: `user_id=eq.${profileId}`,
        },
        (payload: any) => {
          const updatedJob = payload.new as CrawlJobRecord;
          if (updatedJob && updatedJob.id) {
            setActiveCrawlJob(updatedJob);
            if (updatedJob.status === "completed") {
              setIsSyncing(false);
              loadKnowledge();
            } else if (updatedJob.status === "failed") {
              setIsSyncing(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId, supabase, loadKnowledge]);

  // --------------------------------
  // POLLING FALLBACK FOR ACTIVE CRAWL
  // --------------------------------

  useEffect(() => {
    const status = activeCrawlJob?.status;
    const isJobActive =
      status && ["pending", "discovering", "crawling", "processing"].includes(status);

    if (!isJobActive) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/crawl/status");
        if (res.ok) {
          const data = await res.json();
          if (data.job) {
            setActiveCrawlJob(data.job);
            if (data.job.status === "completed") {
              setIsSyncing(false);
              loadKnowledge();
            } else if (data.job.status === "failed") {
              setIsSyncing(false);
            }
          }
        }
      } catch (err) {
        console.warn("[KNOWLEDGE PAGE] Status polling fallback error:", err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activeCrawlJob?.status, loadKnowledge]);

  // --------------------------------
  // DELETE DOCUMENT
  // --------------------------------

  async function deleteDocument(doc: any) {
    const filePath = doc.file_url?.split("/knowledge-files/")[1];

    if (filePath) {
      await supabase.storage.from("knowledge-files").remove([filePath]);
    }

    await supabase.from("knowledge_documents").delete().eq("id", doc.id);

    await loadKnowledge();
  }

  // --------------------------------
  // WEBSITE SYNC
  // --------------------------------

  async function handleWebsiteSync() {
    const rawUrl = urlInput.trim();
    if (!rawUrl || isSyncing) return;

    // Check if an active crawl is currently running (recent within 30 minutes)
    if (
      activeCrawlJob?.status &&
      ["pending", "discovering", "crawling", "processing"].includes(
        activeCrawlJob.status
      )
    ) {
      const startedAt = activeCrawlJob.started_at ? new Date(activeCrawlJob.started_at).getTime() : 0;
      const isRecent = Date.now() - startedAt < 30 * 60 * 1000;
      if (isRecent) {
        setSyncMessage("A crawl is already active for this website.");
        return;
      }
    }

    setIsSyncing(true);
    setSyncMessage("Initializing website crawl...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSyncing(false);
      setSyncMessage("Authentication required to sync website.");
      return;
    }

    // Format & normalize URL
    let formattedUrl = rawUrl;
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // 1. Create crawl job record in Supabase with guaranteed schema
    const { data: crawlJob, error: jobError } = await supabase
      .from("crawl_jobs")
      .insert({
        user_id: user.id,
        url: formattedUrl,
        status: "pending",
        total_pages: 0,
        pages_completed: 0,
        estimated_seconds: 0,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError || !crawlJob) {
      console.error("[CRAWL] Job creation error:", {
        message: jobError?.message || "Unknown error",
        code: jobError?.code,
        details: jobError?.details,
      });
      setSyncMessage(`Failed to create crawl job: ${jobError?.message || "Please try again."}`);
      setIsSyncing(false);
      return;
    }

    // Immediately set active crawl state for instant UI response
    setActiveCrawlJob(crawlJob as CrawlJobRecord);

    // 2. Ensure knowledge_urls record exists
    const { data: knowledgeUrl, error: urlError } = await supabase
      .from("knowledge_urls")
      .insert({
        user_id: user.id,
        url: formattedUrl,
        status: "scanning",
      })
      .select()
      .single();

    if (urlError && urlError.code !== "23505") {
      console.error("[CRAWL] Knowledge URL error:", {
        message: urlError?.message,
        code: urlError?.code,
      });
    }

    setSyncMessage("Crawling started. You can leave this page at any time.");

    // 3. Start crawler API in background
    try {
      const response = await fetch("/api/crawl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: formattedUrl,
          knowledgeUrlId: knowledgeUrl?.id || null,
          crawlJobId: crawlJob.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Website crawler encountered an error.");
      }

      setSyncMessage(
        `Website synced successfully! ${result.pagesProcessed || 0} pages crawled.`
      );

      await loadKnowledge();
    } catch (err: any) {
      console.error("[CRAWL] Execution error:", {
        message: err?.message || "Crawler failed",
      });
      setSyncMessage(err.message || "Website crawl failed.");
    } finally {
      setIsSyncing(false);
    }
  }

  // --------------------------------
  // FILE UPLOAD
  // --------------------------------

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUploading(false);
        return;
      }

      const uniqueName = `${uuidv4()}-${file.name}`;
      const filePath = `${user.id}/${uniqueName}`;

      // UPLOAD FILE
      const { error: uploadError } = await supabase.storage
        .from("knowledge-files")
        .upload(filePath, file);

      if (uploadError) {
        console.error("[UPLOAD] Error:", {
          message: uploadError.message,
        });
        setUploadMessage("Failed to upload document.");
        return;
      }

      // CREATE SIGNED URL
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from("knowledge-files")
        .createSignedUrl(filePath, 3600);

      if (signedUrlError) {
        console.error("[UPLOAD] Signed URL error:", {
          message: signedUrlError.message,
        });
        setUploadMessage("Failed to create document URL.");
        return;
      }

      // SAVE DOCUMENT
      const { error: documentError } = await supabase
        .from("knowledge_documents")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_type: file.type,
          file_url: signedUrl?.signedUrl,
          processing_status: "processing",
        });

      if (documentError) {
        console.error("[UPLOAD] Database error:", {
          message: documentError.message,
        });
        setUploadMessage("File uploaded but failed to save document.");
        return;
      }

      setUploadMessage("Document uploaded successfully.");
      await loadKnowledge();
    } catch (err: any) {
      console.error("[UPLOAD] Fatal error:", {
        message: err?.message,
      });
      setUploadMessage("Document upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <UploadCard
        uploading={uploading}
        uploadMessage={uploadMessage}
        onUpload={handleFileUpload}
      />

      <WebsiteCard
        url={urlInput}
        setUrl={setUrlInput}
        syncing={isSyncing}
        syncMessage={syncMessage}
        onGenerate={handleWebsiteSync}
        activeJob={activeCrawlJob}
        onDismissJob={() => setActiveCrawlJob(null)}
        onRetryJob={handleWebsiteSync}
      />

      {/* Documents */}
      <DocumentList documents={documents} onDelete={deleteDocument} />
    </>
  );
}