import type {
  ConversationContext,
  ConversationEntity,
} from "./conversationContext";

// =====================================================
// FOLLOW-UP PATTERNS
// =====================================================

const FOLLOW_UP_PATTERNS = [
  "how much",
  "what is the price",
  "what's the price",
  "what is price",
  "what's price",
  "price",
  "cost",
  "how expensive",
  "how much are they",
  "how much is it",
  "how much is that",
  "how much do they cost",
  "how much does it cost",
  "are they available",
  "is it available",
  "is that available",
  "are those available",
  "are these available",
  "do they have",
  "what colors",
  "which color",
  "what sizes",
  "which size",
  "which one",
  "which is better",
  "which is cheaper",
  "the first one",
  "the second one",
  "the third one",
  "that one",
  "this one",
  "it",
  "they",
  "them",
  "those",
  "these",
  "same one",
  "same product",
  "same item",
];

// =====================================================
// NEW TOPIC PATTERNS
// =====================================================

const NEW_TOPIC_PATTERNS = [
  "show me",
  "find me",
  "looking for",
  "i need",
  "i want",
  "do you have",
  "can you show",
  "can i see",
  "what about",
  "what other",
  "another",
  "different",
  "something else",
  "more options",
  "other options",
];

// =====================================================
// NORMALIZE
// =====================================================

function normalize(
  text: string
): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[!?.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// CONTAINS ANY
// =====================================================

function containsAny(
  text: string,
  patterns: string[]
): boolean {
  return patterns.some(
    (pattern) =>
      text.includes(pattern)
  );
}

// =====================================================
// FOLLOW-UP DETECTION
// =====================================================

function looksLikeFollowUp(
  text: string
): boolean {
  const normalized =
    normalize(text);

  if (!normalized) {
    return false;
  }

  // ---------------------------------------------------
  // Direct follow-up patterns
  // ---------------------------------------------------

  if (
    containsAny(
      normalized,
      FOLLOW_UP_PATTERNS
    )
  ) {
    return true;
  }

  // ---------------------------------------------------
  // Short contextual questions
  // ---------------------------------------------------

  const words =
    normalized.split(" ");

  if (
    words.length <= 7 &&
    (
      words.includes("they") ||
      words.includes("them") ||
      words.includes("it") ||
      words.includes("that") ||
      words.includes("those") ||
      words.includes("these")
    )
  ) {
    return true;
  }

  return false;
}

// =====================================================
// NEW TOPIC DETECTION
// =====================================================

function looksLikeNewTopic(
  text: string
): boolean {
  const normalized =
    normalize(text);

  return containsAny(
    normalized,
    NEW_TOPIC_PATTERNS
  );
}

// =====================================================
// PRICE FOLLOW-UP
// =====================================================

export function isPriceFollowUp(
  message: string
): boolean {
  const text =
    normalize(message);

  if (!text) {
    return false;
  }

  return (
    text.includes("how much") ||
    text.includes("price") ||
    text.includes("cost") ||
    text.includes("how expensive") ||
    text.includes("what does it cost") ||
    text.includes("what do they cost")
  );
}

// =====================================================
// AVAILABILITY FOLLOW-UP
// =====================================================

export function isAvailabilityFollowUp(
  message: string
): boolean {
  const text =
    normalize(message);

  if (!text) {
    return false;
  }

  return (
    text.includes("available") ||
    text.includes("in stock") ||
    text.includes("in-stock") ||
    text.includes("do they have it") ||
    text.includes("do you have it") ||
    text.includes("can i buy") ||
    text.includes("can i order") ||
    text.includes("is it in stock") ||
    text.includes("are they in stock")
  );
}

// =====================================================
// COLOR FOLLOW-UP
// =====================================================

export function isColorFollowUp(
  message: string
): boolean {
  const text =
    normalize(message);

  if (!text) {
    return false;
  }

  return (
    text.includes("what colors") ||
    text.includes("which colors") ||
    text.includes("other colors") ||
    text.includes("available colors") ||
    text.includes("what colour") ||
    text.includes("what colours")
  );
}

// =====================================================
// SIZE FOLLOW-UP
// =====================================================

export function isSizeFollowUp(
  message: string
): boolean {
  const text =
    normalize(message);

  if (!text) {
    return false;
  }

  return (
    text.includes("what sizes") ||
    text.includes("which sizes") ||
    text.includes("available sizes") ||
    text.includes("what size") ||
    text.includes("which size")
  );
}

// =====================================================
// COMPARISON FOLLOW-UP
// =====================================================

export function isComparisonFollowUp(
  message: string
): boolean {
  const text =
    normalize(message);

  if (!text) {
    return false;
  }

  return (
    text.includes("which one") ||
    text.includes("which is better") ||
    text.includes("which is cheaper") ||
    text.includes("cheaper one") ||
    text.includes("better one") ||
    text.includes("best one") ||
    text.includes("compare them") ||
    text.includes("compare these") ||
    text.includes("compare those")
  );
}

// =====================================================
// RESOLVED QUERY
// =====================================================

export interface ResolvedQuery {
  query: string;

  isFollowUp: boolean;

  isNewTopic: boolean;

  context: ConversationContext;

  referencedEntities: ConversationEntity[];

  effectiveQuery: string;
}

// =====================================================
// ENTITY NAMES
// =====================================================

function getEntityNames(
  entities: ConversationEntity[]
): string[] {
  return entities
    .slice(0, 5)
    .map(
      (entity) =>
        String(
          entity?.name || ""
        ).trim()
    )
    .filter(Boolean);
}

// =====================================================
// RESOLVE CONVERSATION CONTEXT
// =====================================================
//
// This function determines whether the customer is:
//
// 1. Starting a new topic
// 2. Continuing the previous topic
// 3. Referring to previous products/properties/items
//
// Example:
//
// User:
// "Do you have black dresses?"
//
// Then:
//
// User:
// "How much are they?"
//
// "they" refers to the previous entities.
//
// =====================================================

export function resolveConversationContext(
  message: string,
  context: ConversationContext
): ResolvedQuery {
  const currentMessage =
    normalize(message);

  const hasContext =
    Array.isArray(
      context?.entities
    ) &&
    context.entities.length > 0;

  // ---------------------------------------------------
  // Detect follow-up
  // ---------------------------------------------------

  const isFollowUp =
    looksLikeFollowUp(
      currentMessage
    );

  // ---------------------------------------------------
  // Detect new topic
  // ---------------------------------------------------

  const isNewTopic =
    !isFollowUp &&
    looksLikeNewTopic(
      currentMessage
    );

  // ---------------------------------------------------
  // Referenced entities
  // ---------------------------------------------------
  //
  // New topic:
  // Don't blindly reuse previous entities.
  //
  // Follow-up:
  // Reuse current entities.
  //
  // Normal message:
  // Keep context available because the AI may still
  // need it.
  // ---------------------------------------------------

  let referencedEntities: ConversationEntity[] =
    hasContext
      ? context.entities
      : [];

  if (isNewTopic) {
    referencedEntities = [];
  }

  // ---------------------------------------------------
  // EFFECTIVE QUERY
  // ---------------------------------------------------

  let effectiveQuery =
    currentMessage;

  // ---------------------------------------------------
  // FOLLOW-UP WITH EXISTING ENTITIES
  // ---------------------------------------------------

  if (
    isFollowUp &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `${currentMessage}. Previous relevant items: ${entityNames.join(
          ", "
        )}.`;
    }
  }

  // ---------------------------------------------------
  // SPECIAL FOLLOW-UP TYPES
  // ---------------------------------------------------

  if (
    isPriceFollowUp(
      currentMessage
    ) &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `What is the price of these previous items: ${entityNames.join(
          ", "
        )}?`;
    }
  }

  if (
    isAvailabilityFollowUp(
      currentMessage
    ) &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `Are these previous items available: ${entityNames.join(
          ", "
        )}?`;
    }
  }

  if (
    isColorFollowUp(
      currentMessage
    ) &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `What colors are available for these previous items: ${entityNames.join(
          ", "
        )}?`;
    }
  }

  if (
    isSizeFollowUp(
      currentMessage
    ) &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `What sizes are available for these previous items: ${entityNames.join(
          ", "
        )}?`;
    }
  }

  if (
    isComparisonFollowUp(
      currentMessage
    ) &&
    hasContext
  ) {
    const entityNames =
      getEntityNames(
        context.entities
      );

    if (
      entityNames.length > 0
    ) {
      effectiveQuery =
        `Compare these previous items: ${entityNames.join(
          ", "
        )}.`;
    }
  }

  // ---------------------------------------------------
  // RETURN
  // ---------------------------------------------------

  return {
    query:
      currentMessage,

    isFollowUp,

    isNewTopic,

    context,

    referencedEntities,

    effectiveQuery,
  };
}