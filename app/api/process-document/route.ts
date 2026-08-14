import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { extractDocument } from "@/lib/documents/extractDocument";
import { createEmbedding } from "@/lib/ai/embeddings";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function splitText(text: string, size = 500) {
  const chunks: string[] = [];

  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }

  return chunks;
}

export async function POST(req: Request) {
  try {
    const {
      fileUrl,
      fileName,
    } = await req.json();

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        {
          error: "Missing file information",
        },
        {
          status: 400,
        }
      );
    }

    console.log("Processing document:", fileName);

    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(
        "Unable to download document."
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    const text = await extractDocument(
      buffer,
      fileName
    );

    if (!text || text.trim().length < 20) {
      throw new Error(
        "No readable text found."
      );
    }

    const {
      data: document,
      error: documentError,
    } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("file_url", fileUrl)
      .single();

    if (documentError || !document) {
      throw new Error(
        "Document record not found."
      );
    }

    console.log(
      "Document loaded:",
      document.id
    );
        // ----------------------------------
    // Save document as a knowledge page
    // ----------------------------------

    const {
      data: page,
      error: pageError,
    } = await supabase
      .from("knowledge_pages")
      .insert({
        user_id: document.user_id,
        title: fileName,
        page_url: fileUrl,
        content: text,
        page_type: "document",
      })
      .select()
      .single();

    if (pageError || !page) {
      throw pageError;
    }

    console.log(
      "Knowledge page created:",
      page.id
    );

    // ----------------------------------
    // Split into chunks
    // ----------------------------------

    const chunks = splitText(text);

    console.log(
      "Chunks:",
      chunks.length
    );

    const chunkRows = chunks.map(
      (chunk) => ({
        user_id: document.user_id,
        knowledge_page_id: page.id,
        source_url: fileUrl,
        content: chunk,
      })
    );

    const {
      data: createdChunks,
      error: chunkError,
    } = await supabase
      .from("knowledge_chunks")
      .insert(chunkRows)
      .select();

    if (chunkError) {
      throw chunkError;
    }

    console.log(
      "Chunks saved:",
      createdChunks.length
    );
        // ----------------------------------
    // Create embeddings
    // ----------------------------------

    for (const chunk of createdChunks) {
      console.log(
        "Creating embedding..."
      );

      const embedding =
        await createEmbedding(
          chunk.content
        );

      const {
        error: embeddingError,
      } = await supabase
        .from("knowledge_chunks")
        .update({
          embedding,
        })
        .eq("id", chunk.id);

      if (embeddingError) {
        console.error(
          embeddingError
        );
      }
    }

    // ----------------------------------
    // Mark document as completed
    // ----------------------------------

    const {
      error: updateError,
    } = await supabase
      .from("knowledge_documents")
      .update({
        processing_status:
          "completed",
      })
      .eq("id", document.id);

    if (updateError) {
      console.error(updateError);
    }

    return NextResponse.json({
      success: true,
      pagesProcessed: 1,
      chunksCreated:
        createdChunks.length,
    });

  } catch (error: any) {

    console.error(
      "PROCESS DOCUMENT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Document processing failed",
      },
      {
        status: 500,
      }
    );

  }
}