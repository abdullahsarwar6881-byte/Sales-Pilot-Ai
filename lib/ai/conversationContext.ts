// =====================================================
// ENTITY TYPES
// =====================================================

export type EntityType =
  | "product"
  | "property"
  | "menu_item"
  | "service"
  | "room"
  | "doctor"
  | "course"
  | "general"
  | "unknown";

// =====================================================
// CONVERSATION ENTITY
// =====================================================

export interface ConversationEntity {
  id?: string;

  type: EntityType;

  name: string;

  url?: string;

  imageUrl?: string;

  price?: string;

  currency?: string;

  available?: boolean;

  metadata?: Record<string, unknown>;
}

// =====================================================
// CONVERSATION CONTEXT
// =====================================================

export interface ConversationContext {
  entityType: EntityType;

  entities: ConversationEntity[];

  filters: Record<string, unknown>;

  lastUserQuery: string;

  lastIntent: string;

  lastResponse: string;

  lastSearch?: string;

  updatedAt: string;
}

// =====================================================
// EMPTY CONTEXT
// =====================================================

export function createEmptyConversationContext(): ConversationContext {
  return {
    entityType: "unknown",

    entities: [],

    filters: {},

    lastUserQuery: "",

    lastIntent: "",

    lastResponse: "",

    lastSearch: "",

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// SAFE STRING
// =====================================================

function safeString(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

// =====================================================
// FIRST AVAILABLE VALUE
// =====================================================

function firstValue(
  ...values: unknown[]
): string {
  for (const value of values) {
    const result =
      safeString(value);

    if (result) {
      return result;
    }
  }

  return "";
}

// =====================================================
// NORMALIZE URL
// =====================================================

function normalizeUrl(
  value: unknown
): string {
  const url =
    safeString(value);

  if (!url) {
    return "";
  }

  return url.replace(
    /[),.;]+$/,
    ""
  );
}

// =====================================================
// NORMALIZE PRICE
// =====================================================

function normalizePrice(
  value: unknown
): string {
  const price =
    safeString(value);

  if (!price) {
    return "";
  }

  return price
    .replace(
      /^(regular price|sale price|price)\s*:?\s*/i,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

// =====================================================
// GET AVAILABILITY
// =====================================================

function getAvailability(
  input: any
): boolean | undefined {
  // ---------------------------------------------------
  // Direct boolean
  // ---------------------------------------------------

  if (
    typeof input?.available ===
    "boolean"
  ) {
    return input.available;
  }

  // ---------------------------------------------------
  // Shopify
  // ---------------------------------------------------

  if (
    typeof input?.available_for_sale ===
    "boolean"
  ) {
    return input.available_for_sale;
  }

  if (
    typeof input?.availableForSale ===
    "boolean"
  ) {
    return input.availableForSale;
  }

  // ---------------------------------------------------
  // Other ecommerce systems
  // ---------------------------------------------------

  if (
    typeof input?.in_stock ===
    "boolean"
  ) {
    return input.in_stock;
  }

  if (
    typeof input?.inStock ===
    "boolean"
  ) {
    return input.inStock;
  }

  // ---------------------------------------------------
  // Inventory
  // ---------------------------------------------------

  if (
    typeof input?.inventory_quantity ===
    "number"
  ) {
    return (
      input.inventory_quantity > 0
    );
  }

  if (
    typeof input?.inventoryQuantity ===
    "number"
  ) {
    return (
      input.inventoryQuantity > 0
    );
  }

  // ---------------------------------------------------
  // Text availability
  // ---------------------------------------------------

  const availability =
    safeString(
      input?.availability ||
        input?.stock_status ||
        input?.stockStatus
    ).toLowerCase();

  if (
    availability
      .includes("out of stock") ||
    availability.includes(
      "unavailable"
    ) ||
    availability.includes(
      "sold out"
    )
  ) {
    return false;
  }

  if (
    availability.includes(
      "in stock"
    ) ||
    availability.includes(
      "available"
    )
  ) {
    return true;
  }

  return undefined;
}

// =====================================================
// CREATE CONVERSATION ENTITY
// =====================================================
//
// Converts any business object into a standard
// Sales Pilot conversation entity.
//
// Works with:
//
// - Ecommerce products
// - Real estate properties
// - Restaurant menu items
// - Hotel rooms
// - Services
// - Doctors
// - Courses
// - Other business entities
//
// =====================================================

export function createConversationEntity(
  input: any,
  type: ConversationEntity["type"]
): ConversationEntity {
  if (
    !input ||
    typeof input !== "object"
  ) {
    return {
      type,

      name: "Item",

      metadata: {},
    };
  }

  const id =
    firstValue(
      input.id,
      input.externalId,
      input.external_id,
      input.product_id,
      input.productId,
      input.property_id,
      input.propertyId,
      input.service_id,
      input.serviceId,
      input.room_id,
      input.roomId
    );

  const name =
    firstValue(
      input.name,
      input.title,
      input.label,
      input.product_name,
      input.productName,
      input.property_name,
      input.propertyName,
      input.service_name,
      input.serviceName,
      input.room_name,
      input.roomName,
      input.menu_item_name,
      input.menuItemName
    ) || "Item";

  const url =
    normalizeUrl(
      firstValue(
        input.productUrl,
        input.product_url,
        input.productURL,
        input.propertyUrl,
        input.property_url,
        input.serviceUrl,
        input.service_url,
        input.roomUrl,
        input.room_url,
        input.url,
        input.page_url,
        input.pageUrl,
        input.source_url,
        input.sourceUrl,
        input.link
      )
    );

  const imageUrl =
    normalizeUrl(
      firstValue(
        input.imageUrl,
        input.image_url,
        input.imageURL,
        input.image,
        input.featured_image,
        input.featuredImage,
        input.thumbnail,
        input.thumbnailUrl,
        input.photo,
        input.photoUrl
      )
    );

  const price =
    normalizePrice(
      firstValue(
        input.price,
        input.amount,
        input.min_price,
        input.minPrice,
        input.starting_price,
        input.startingPrice,
        input.sale_price,
        input.salePrice
      )
    );

  const currency =
    firstValue(
      input.currency,
      input.currency_code,
      input.currencyCode
    );

  const available =
    getAvailability(
      input
    );

  return {
    id:
      id || undefined,

    type,

    name,

    url:
      url || undefined,

    imageUrl:
      imageUrl || undefined,

    price:
      price || undefined,

    currency:
      currency || undefined,

    available,

    metadata: {
      ...input,
    },
  };
}

// =====================================================
// SET CONVERSATION ENTITIES
// =====================================================
//
// Replaces the current entities with the latest
// relevant entities.
//
// Example:
//
// Customer:
// "Show me black dresses"
//
// Current entities:
// Black Dress A
// Black Dress B
//
// Customer:
// "What about white?"
//
// Current entities become:
// White Dress A
// White Dress B
//
// =====================================================

export function setConversationEntities(
  context: ConversationContext,
  entities: ConversationEntity[],
  options?: {
    entityType?: EntityType;

    search?: string;

    filters?: Record<
      string,
      unknown
    >;

    lastIntent?: string;

    lastUserQuery?: string;

    lastResponse?: string;
  }
): ConversationContext {
  const uniqueEntities =
    deduplicateConversationEntities(
      entities
    );

  return {
    ...context,

    entityType:
      options?.entityType ||
      context.entityType,

    entities:
      uniqueEntities,

    filters:
      options?.filters ||
      context.filters,

    lastSearch:
      options?.search ??
      context.lastSearch ??
      "",

    lastIntent:
      options?.lastIntent ??
      context.lastIntent,

    lastUserQuery:
      options?.lastUserQuery ??
      context.lastUserQuery,

    lastResponse:
      options?.lastResponse ??
      context.lastResponse,

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// ADD CONVERSATION ENTITIES
// =====================================================
//
// Useful when you want to preserve existing entities
// and add new ones.
//

export function addConversationEntities(
  context: ConversationContext,
  entities: ConversationEntity[]
): ConversationContext {
  return {
    ...context,

    entities:
      deduplicateConversationEntities(
        [
          ...context.entities,
          ...entities,
        ]
      ),

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// DEDUPLICATE CONVERSATION ENTITIES
// =====================================================

export function deduplicateConversationEntities(
  entities: ConversationEntity[]
): ConversationEntity[] {
  const seen =
    new Set<string>();

  const result: ConversationEntity[] =
    [];

  for (
    const entity of entities
  ) {
    if (!entity) {
      continue;
    }

    const normalizedName =
      safeString(
        entity.name
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    const normalizedUrl =
      safeString(
        entity.url
      )
        .toLowerCase()
        .trim();

    const id =
      safeString(
        entity.id
      )
        .toLowerCase()
        .trim();

    const key =
      id
        ? `id:${id}`
        : normalizedUrl
          ? `url:${normalizedUrl}`
          : `name:${entity.type}:${normalizedName}`;

    if (
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    result.push(entity);
  }

  return result;
}

// =====================================================
// UPDATE LAST USER MESSAGE
// =====================================================

export function updateLastUserQuery(
  context: ConversationContext,
  query: string
): ConversationContext {
  return {
    ...context,

    lastUserQuery:
      safeString(query),

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// UPDATE LAST RESPONSE
// =====================================================

export function updateLastResponse(
  context: ConversationContext,
  response: string
): ConversationContext {
  return {
    ...context,

    lastResponse:
      safeString(response),

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// UPDATE SEARCH
// =====================================================

export function updateConversationSearch(
  context: ConversationContext,
  search: string
): ConversationContext {
  return {
    ...context,

    lastSearch:
      safeString(search),

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// UPDATE INTENT
// =====================================================

export function updateConversationIntent(
  context: ConversationContext,
  intent: string
): ConversationContext {
  return {
    ...context,

    lastIntent:
      safeString(intent),

    updatedAt:
      new Date().toISOString(),
  };
}

// =====================================================
// CLEAR ENTITIES
// =====================================================

export function clearConversationEntities(
  context: ConversationContext
): ConversationContext {
  return {
    ...context,

    entityType:
      "unknown",

    entities: [],

    filters: {},

    lastSearch: "",

    updatedAt:
      new Date().toISOString(),
  };
}