import { extractPdfText } from "./extractPdf";
import { extractDocx } from "./extractDocx";
import { extractText } from "./extractText";

export async function extractDocument(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  const type = fileType.toLowerCase();

  // PDF
  if (
    type === "application/pdf" ||
    type.endsWith(".pdf")
  ) {
    return await extractPdfText(buffer);
  }

  // DOCX
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    type.endsWith(".docx")
  ) {
    return await extractDocx(buffer);
  }

  // TXT
  if (
    type === "text/plain" ||
    type.endsWith(".txt")
  ) {
    return await extractText(buffer);
  }

  throw new Error(
    `Unsupported file type: ${fileType}`
  );
}