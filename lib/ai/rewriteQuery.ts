import type {
  ConversationContext,
} from "./conversationContext";

export function rewriteQuery(
  message: string,
  context: ConversationContext
) {
  const current =
    message.trim();

  if (!current) {
    return "";
  }

  if (
    !context.lastSearch
  ) {
    return current;
  }

  const lower =
    current.toLowerCase();

  // ---------------------------------------------------
  // FOLLOW-UP PRICE QUESTIONS
  // ---------------------------------------------------

  if (
    lower.includes("how much") ||
    lower.includes("price") ||
    lower.includes("cost")
  ) {
    return context.lastSearch;
  }

  // ---------------------------------------------------
  // COLOR / ATTRIBUTE CHANGE
  // ---------------------------------------------------

  const colors = [
    "black",
    "white",
    "red",
    "blue",
    "green",
    "pink",
    "yellow",
    "brown",
    "beige",
    "purple",
    "orange",
  ];

  const newColor =
    colors.find(
      (color) =>
        lower.includes(color)
    );

  if (
    newColor &&
    context.lastSearch
  ) {
    const withoutOldColor =
      context.lastSearch.replace(
        /\b(black|white|red|blue|green|pink|yellow|brown|beige|purple|orange)\b/gi,
        ""
      );

    return `${withoutOldColor} ${newColor}`
      .replace(/\s+/g, " ")
      .trim();
  }

  return current;
}