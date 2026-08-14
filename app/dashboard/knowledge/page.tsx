"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

import KnowledgeStats from "@/components/knowledge/KnowledgeStats";
import UploadCard from "@/components/knowledge/UploadCard";
import WebsiteCard from "@/components/knowledge/WebsiteCard";
import InstallCodeCard from "@/components/knowledge/InstallCodeCard";
import DocumentList from "@/components/knowledge/DocumentList";

export default function KnowledgePage() {
  const supabase = createClient();

  const [urlInput, setUrlInput] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [pages, setPages] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [connected, setConnected] = useState(false);

  // Profile ID used by the widget installation code
  const [profileId, setProfileId] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const [syncMessage, setSyncMessage] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadKnowledge();
  }, []);

  // --------------------------------
  // LOAD KNOWLEDGE
  // --------------------------------

  async function loadKnowledge() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // IMPORTANT:
    // Your profiles.id is the same as auth.users.id.
    // Therefore the authenticated user's ID is the profile ID.
    setProfileId(user.id);

    const [
      documentsData,
      pagesData,
      chunksData,
      urlsData,
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
    ]);

    setDocuments(
      documentsData.data || []
    );

    setPages(
      pagesData.count || 0
    );

    setChunks(
      chunksData.count || 0
    );

    setConnected(
      (urlsData.data?.length || 0) > 0
    );
  }

  // --------------------------------
  // DELETE DOCUMENT
  // --------------------------------

  async function deleteDocument(
    doc: any
  ) {
    const filePath =
      doc.file_url?.split(
        "/knowledge-files/"
      )[1];

    if (filePath) {
      await supabase.storage
        .from("knowledge-files")
        .remove([filePath]);
    }

    await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", doc.id);

    await loadKnowledge();
  }

  // --------------------------------
  // WEBSITE SYNC
  // --------------------------------

  async function handleWebsiteSync() {
    if (!urlInput.trim()) return;

    setIsSyncing(true);

    setSyncMessage(
      "Creating sync job..."
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSyncing(false);
      return;
    }

    // --------------------------------
    // CREATE CRAWL JOB
    // --------------------------------

    const {
      data: crawlJob,
      error: jobError,
    } = await supabase
      .from("crawl_jobs")
      .insert({
        user_id: user.id,
        url: urlInput,
        status: "crawling",
      })
      .select()
      .single();

    if (
      jobError ||
      !crawlJob
    ) {
      console.error(
        "Crawl job error:",
        jobError
      );

      setSyncMessage(
        "Failed to create crawl job."
      );

      setIsSyncing(false);

      return;
    }

    // --------------------------------
    // SAVE WEBSITE
    // --------------------------------

    const {
      data: knowledgeUrl,
      error,
    } = await supabase
      .from("knowledge_urls")
      .insert({
        user_id: user.id,
        url: urlInput,
        status: "scanning",
      })
      .select()
      .single();

    if (
      error ||
      !knowledgeUrl
    ) {
      console.error(
        "Knowledge URL error:",
        error
      );

      setSyncMessage(
        "Failed to save website."
      );

      setIsSyncing(false);

      return;
    }

    setSyncMessage(
      "Starting website crawler..."
    );

    // --------------------------------
    // START CRAWLER API
    // --------------------------------

    try {
      const response =
        await fetch(
          "/api/crawl",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              url: urlInput,

              knowledgeUrlId:
                knowledgeUrl.id,

              crawlJobId:
                crawlJob.id,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Crawler failed."
        );
      }

      setSyncMessage(
        `Website synced successfully! ${result.pagesProcessed} pages crawled.`
      );

      await loadKnowledge();
    } catch (err: any) {
      console.error(
        "Website crawl error:",
        err
      );

      setSyncMessage(
        err.message ||
          "Website crawl failed."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  // --------------------------------
  // FILE UPLOAD
  // --------------------------------

  async function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      e.target.files?.[0];

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

      const uniqueName =
        `${uuidv4()}-${file.name}`;

      const filePath =
        `${user.id}/${uniqueName}`;

      // --------------------------------
      // UPLOAD FILE
      // --------------------------------

      const {
        error: uploadError,
      } = await supabase.storage
        .from("knowledge-files")
        .upload(
          filePath,
          file
        );

      if (uploadError) {
        console.error(
          "Upload error:",
          uploadError
        );

        setUploadMessage(
          "Failed to upload document."
        );

        return;
      }

      // --------------------------------
      // CREATE SIGNED URL
      // --------------------------------

      const {
        data: signedUrl,
        error:
          signedUrlError,
      } =
        await supabase.storage
          .from(
            "knowledge-files"
          )
          .createSignedUrl(
            filePath,
            3600
          );

      if (signedUrlError) {
        console.error(
          "Signed URL error:",
          signedUrlError
        );

        setUploadMessage(
          "Failed to create document URL."
        );

        return;
      }

      // --------------------------------
      // SAVE DOCUMENT
      // --------------------------------

      const {
        error: documentError,
      } = await supabase
        .from(
          "knowledge_documents"
        )
        .insert({
          user_id: user.id,

          file_name:
            file.name,

          file_type:
            file.type,

          file_url:
            signedUrl?.signedUrl,

          processing_status:
            "processing",
        });

      if (documentError) {
        console.error(
          "Document database error:",
          documentError
        );

        setUploadMessage(
          "File uploaded but failed to save document."
        );

        return;
      }

      setUploadMessage(
        "Document uploaded successfully."
      );

      await loadKnowledge();
    } catch (err) {
      console.error(
        "File upload error:",
        err
      );

      setUploadMessage(
        "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  // --------------------------------
  // PAGE
  // --------------------------------

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
        onGenerate={
          handleWebsiteSync
        }
      />

      {isSyncing && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 animate-pulse rounded-full bg-blue-600" />

            <p className="font-semibold text-blue-700">
              Website Sync in Progress
            </p>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Your website is currently
            being crawled and processed.
            This may take a few moments
            depending on the size of your
            website.
          </p>

          <p className="mt-3 text-sm font-medium text-slate-700">
            {syncMessage}
          </p>
        </div>
      )}

      {/* Installation Code */}

      <InstallCodeCard
        websiteUrl={urlInput}
        profileId={profileId}
      />

      {/* Documents */}

      <DocumentList
        documents={documents}
        onDelete={deleteDocument}
      />
    </>
  );
}