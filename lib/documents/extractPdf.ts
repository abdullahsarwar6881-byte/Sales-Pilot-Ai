import pdf from "pdf-parse/lib/pdf-parse.js";

export async function extractPdfText(
  buffer: Buffer
): Promise<string> {
  try {
    console.log("PDF buffer size:", buffer.length);

    const data = await pdf(buffer);

    console.log(
      "PDF pages:",
      data.numpages
    );

    console.log(
      "Extracted text length:",
      data.text.length
    );

    return data.text.trim();

  } catch (error: any) {

    console.error(
      "REAL PDF ERROR:",
      error
    );

    throw error;
  }
}