import mammoth from "mammoth";

export async function extractDocx(
  buffer: Buffer
) {

  const result =
    await mammoth.extractRawText({

      buffer

    });

  return result.value;

}