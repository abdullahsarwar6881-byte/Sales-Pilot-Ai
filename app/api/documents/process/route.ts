import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { extractDocument } from "@/lib/documents/extractDocument";
import { classifyContent } from "@/lib/ai/classifyContent";
import { createEmbedding } from "@/lib/ai/embeddings";

function splitText(
  text: string,
  size = 500
) {
  const chunks: string[] = [];

  for (
    let i = 0;
    i < text.length;
    i += size
  ) {
    chunks.push(
      text.slice(i, i + size)
    );
  }

  return chunks;
}

export async function POST(
  req: Request
) {
  try {
    const {
      documentId
    } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        {
          error: "Missing document id"
        },
        {
          status: 400
        }
      );
    }

    const supabase =
      await createClient();


    const {
      data: {
        user
      }
    } =
      await supabase.auth.getUser();


    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized"
        },
        {
          status: 401
        }
      );
    }


    const {
      data: document,
      error: documentError
    } =
      await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .single();


    if (documentError || !document) {
      return NextResponse.json(
        {
          error: "Document not found"
        },
        {
          status: 404
        }
      );
    }


    const response =
      await fetch(document.file_url);


    if (!response.ok) {
      throw new Error(
        "Unable to download document"
      );
    }


    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );


    const content =
      await extractDocument(
        buffer,
        document.file_type
      );


    if (!content || content.trim().length < 10) {
      throw new Error(
        "No readable text found"
      );
    }


    const pageType =
      await classifyContent(
        document.file_name,
        content
      );


    const chunks =
      splitText(content);


    console.log(
      "Chunks created:",
      chunks.length
    );


    const chunkRows = [];


    for (const chunk of chunks) {

      const embedding =
        await createEmbedding(chunk);


      chunkRows.push({

        user_id:
          user.id,

        knowledge_document_id:
          document.id,

        source_url:
          document.file_url,

        content:
          chunk,

        embedding

      });

    }


    const {
      error: chunkError
    } =
      await supabase
        .from("knowledge_chunks")
        .insert(chunkRows);


    if (chunkError) {
      throw chunkError;
    }


    await supabase
      .from("knowledge_documents")
      .update({

        processing_status:
          "completed",

        page_type:
          pageType

      })
      .eq(
        "id",
        document.id
      );


    return NextResponse.json({

      success:
        true,

      pageType,

      chunksCreated:
        chunks.length

    });


  } catch (error: any) {


    console.error(
      "DOCUMENT PROCESS ERROR:",
      error
    );


    return NextResponse.json(
      {
        error:
          error.message ||
          "Document processing failed"
      },
      {
        status: 500
      }
    );

  }
}