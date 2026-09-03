// =====================================================
// SALES PILOT ACTION TYPES
// =====================================================
//
// Central type definitions for:
//
// AI intent detection
// Action execution
// Product search
// Product recommendations
// Order operations
// Policy retrieval
// Human handoff
// Conversation context
//
// IMPORTANT:
//
// These types describe actions.
// They do NOT execute actions.
//
// =====================================================


// =====================================================
// ACTION NAMES
// =====================================================

export type ActionName =
  | "search_products"

  | "get_product_details"
  | "check_product_stock"
  | "get_product_price"
  | "get_product_variants"
  | "get_product_recommendations"
  | "compare_products"

  | "get_order_status"
  | "get_order_details"

  | "get_shipping_policy"
  | "get_return_policy"

  | "handoff_to_human";


// =====================================================
// ENTITY TYPES
// =====================================================
//
// Entity = something the customer is referring to.
//
// Examples:
//
// "that dress"        → product
// "the first one"     → product
// "shipping"          → property
// "suite"             → room
// "doctor"            → doctor
//
// =====================================================

export type EntityType =
  | "product"
  | "property"
  | "menu_item"
  | "service"
  | "room"
  | "doctor"
  | "course"
  | "order"
  | "collection"
  | "policy"
  | "general"
  | "unknown";


// =====================================================
// ACTION PRIORITY
// =====================================================
//
// Used when multiple possible actions are detected.
//
// Example:
//
// "Can you find a black dress and tell me the price?"
//
// Primary action:
// search_products
//
// Follow-up action:
// get_product_price
//
// =====================================================

export type ActionPriority =
  | "low"
  | "normal"
  | "high"
  | "critical";


// =====================================================
// ACTION SOURCE
// =====================================================
//
// Helps identify where an action came from.
//
// ai          → model requested it
// detector    → local rule-based detector
// system      → internal system action
// fallback    → fallback behavior
//
// =====================================================

export type ActionSource =
  | "ai"
  | "detector"
  | "system"
  | "fallback";


// =====================================================
// PRODUCT FILTERS
// =====================================================
//
// Generic ecommerce filters.
//
// These are intentionally flexible because different
// stores may have different product structures.
//
// =====================================================

export interface ProductFilters {
  category?: string;

  categories?: string[];

  color?: string;

  colors?: string[];

  size?: string;

  sizes?: string[];

  material?: string;

  materials?: string[];

  style?: string;

  brand?: string;

  vendor?: string;

  collection?: string;

  collectionId?: string;

  productType?: string;

  availability?: boolean;

  inStock?: boolean;

  minPrice?: number;

  maxPrice?: number;

  currency?: string;

  sku?: string;

  query?: string;

  [key: string]: unknown;
}


// =====================================================
// PRODUCT REFERENCE
// =====================================================
//
// Used when the customer refers to something previously
// shown in the conversation.
//
// Examples:
//
// "the first one"
// "the second dress"
// "that product"
// "the black one"
//
// =====================================================

export interface EntityReference {
  type: EntityType;

  id?: string;

  name?: string;

  index?: number;

  url?: string;

  confidence?: number;

  source?: "current_message" | "conversation" | "action_result";
}


// =====================================================
// CONVERSATION CONTEXT
// =====================================================
//
// This is extremely important for ChatGPT-like behavior.
//
// It allows Sales Pilot to understand:
//
// "How much is the first one?"
// "Is that available?"
// "Does it come in blue?"
// "Show me another one."
//
// =====================================================

export interface ActionContext {
  entityType?: EntityType;

  entityIds?: string[];

  entityNames?: string[];

  entityReferences?: EntityReference[];

  previousQuery?: string;

  previousAction?: ActionName;

  previousActionId?: string;

  previousResultIds?: string[];

  previousResultNames?: string[];

  selectedEntityId?: string;

  selectedEntityName?: string;

  selectedEntityIndex?: number;

  filters?: ProductFilters;

  conversationId?: string;

  messageId?: string;

  turnNumber?: number;

  [key: string]: unknown;
}


// =====================================================
// ACTION REQUEST
// =====================================================
//
// This is what the action detector / AI produces.
//
// Example:
//
// {
//   action: "search_products",
//   parameters: {
//     query: "black dresses"
//   }
// }
//
// Or:
//
// {
//   action: "get_product_price",
//   parameters: {
//     productId: "123"
//   },
//   context: {
//     entityType: "product",
//     selectedEntityIndex: 0
//   }
// }
//
// =====================================================

export interface ActionRequest {
  action: ActionName;

  parameters: Record<string, unknown>;

  context?: ActionContext;

  priority?: ActionPriority;

  source?: ActionSource;

  confidence?: number;

  reasoning?: string;

  requestId?: string;
}


// =====================================================
// ACTION ENTITY
// =====================================================
//
// Returned by an action when it discovers an entity.
//
// Example:
//
// search_products discovers:
//
// - Black Lawn Dress
// - Black Embroidered Suit
// - Black Chiffon Dress
//
// These entities can then become conversation context.
//
// =====================================================

export interface ActionEntity {
  id?: string;

  externalId?: string;

  type: EntityType;

  name: string;

  title?: string;

  url?: string;

  imageUrl?: string;

  description?: string;

  price?: string;

  currency?: string;

  available?: boolean;

  sku?: string;

  collectionNames?: string[];

  collectionUrls?: string[];

  metadata?: Record<string, unknown>;
}


// =====================================================
// ACTION RESULT METADATA
// =====================================================
//
// Debugging / tracing information.
//
// This should NOT normally be shown to customers.
//
// =====================================================

export interface ActionResultMetadata {
  action?: ActionName;

  source?: ActionSource;

  query?: string;

  resultCount?: number;

  executionTimeMs?: number;

  requestId?: string;

  conversationId?: string;

  messageId?: string;

  timestamp?: string;

  [key: string]: unknown;
}


// =====================================================
// ACTION RESULT
// =====================================================
//
// Standard response returned by every action executor.
//
// =====================================================

export interface ActionResult {
  success: boolean;

  data?: unknown;

  error?: string;

  message?: string;

  entities?: ActionEntity[];

  metadata?: ActionResultMetadata;

  context?: ActionContext;
}


// =====================================================
// PRODUCT SEARCH PARAMETERS
// =====================================================

export interface SearchProductsParameters {
  query: string;

  filters?: ProductFilters;

  limit?: number;

  sortBy?:
    | "relevance"
    | "price_low"
    | "price_high"
    | "newest"
    | "availability";

  includeOutOfStock?: boolean;
}


// =====================================================
// PRODUCT DETAIL PARAMETERS
// =====================================================

export interface ProductDetailsParameters {
  productId?: string;

  externalId?: string;

  productName?: string;

  url?: string;

  sku?: string;
}


// =====================================================
// PRODUCT STOCK PARAMETERS
// =====================================================

export interface ProductStockParameters {
  productId?: string;

  externalId?: string;

  productName?: string;

  variantId?: string;

  variantName?: string;

  sku?: string;
}


// =====================================================
// PRODUCT PRICE PARAMETERS
// =====================================================

export interface ProductPriceParameters {
  productId?: string;

  externalId?: string;

  productName?: string;

  variantId?: string;

  variantName?: string;

  sku?: string;

  currency?: string;
}


// =====================================================
// PRODUCT VARIANT PARAMETERS
// =====================================================

export interface ProductVariantsParameters {
  productId?: string;

  externalId?: string;

  productName?: string;

  sku?: string;
}


// =====================================================
// PRODUCT RECOMMENDATION PARAMETERS
// =====================================================

export interface ProductRecommendationParameters {
  query?: string;

  productId?: string;

  productName?: string;

  filters?: ProductFilters;

  limit?: number;

  excludeProductIds?: string[];
}


// =====================================================
// PRODUCT COMPARISON PARAMETERS
// =====================================================

export interface CompareProductsParameters {
  productIds?: string[];

  productNames?: string[];

  urls?: string[];

  attributes?: string[];
}


// =====================================================
// ORDER PARAMETERS
// =====================================================

export interface OrderParameters {
  orderNumber?: string;

  orderId?: string;

  email?: string;

  phone?: string;
}


// =====================================================
// POLICY PARAMETERS
// =====================================================

export interface PolicyParameters {
  topic?: string;

  query?: string;
}


// =====================================================
// HUMAN HANDOFF PARAMETERS
// =====================================================

export interface HandoffParameters {
 reason?: string;

  customerMessage?: string;

  priority?: ActionPriority;

  conversationId?: string;
}


// =====================================================
// TYPED ACTION PARAMETER MAP
// =====================================================
//
// Useful when you want stronger TypeScript typing while
// executing actions.
//
// =====================================================

export interface ActionParameterMap {
  search_products: SearchProductsParameters;

  get_product_details: ProductDetailsParameters;

  check_product_stock: ProductStockParameters;

  get_product_price: ProductPriceParameters;

  get_product_variants: ProductVariantsParameters;

  get_product_recommendations:
    ProductRecommendationParameters;

  compare_products:
    CompareProductsParameters;

  get_order_status:
    OrderParameters;

  get_order_details:
    OrderParameters;

  get_shipping_policy:
    PolicyParameters;

  get_return_policy:
    PolicyParameters;

  handoff_to_human:
    HandoffParameters;
}


// =====================================================
// ACTION EXECUTION STATUS
// =====================================================

export type ActionExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled";


// =====================================================
// ACTION EXECUTION
// =====================================================
//
// Useful for logging and tracing an action through the
// complete Sales Pilot pipeline.
//
// =====================================================

export interface ActionExecution {
  id: string;

  action: ActionName;

  status: ActionExecutionStatus;

  request?: ActionRequest;

  result?: ActionResult;

  startedAt?: string;

  completedAt?: string;

  executionTimeMs?: number;

  error?: string;
}


// =====================================================
// ACTION DETECTION RESULT
// =====================================================
//
// Used when the system wants to explain what it detected
// internally.
//
// Example:
//
// "show me black dresses"
//
// → action: search_products
// → confidence: 0.98
//
// =====================================================

export interface ActionDetectionResult {
  action: ActionName | null;

  parameters: Record<string, unknown>;

  confidence: number;

  matchedEntities?: EntityReference[];

  context?: ActionContext;

  source?: ActionSource;

  alternatives?: Array<{
    action: ActionName;

    confidence: number;

    parameters?: Record<string, unknown>;
  }>;
}


// =====================================================
// CONVERSATION ENTITY
// =====================================================
//
// Persistent entity memory for the conversation.
//
// =====================================================

export interface ConversationEntity {
  id?: string;

  type: EntityType;

  name: string;

  externalId?: string;

  url?: string;

  imageUrl?: string;

  price?: string;

  currency?: string;

  available?: boolean;

  firstSeenTurn?: number;

  lastSeenTurn?: number;

  metadata?: Record<string, unknown>;
}


// =====================================================
// CONVERSATION ACTION MEMORY
// =====================================================
//
// Stores previous actions so follow-up questions can
// resolve naturally.
//
// Example:
//
// User:
// "Show me black dresses"
//
// Action:
// search_products
//
// User:
// "How much is the first one?"
//
// The system can use the previous action to resolve
// "the first one."
//
// =====================================================

export interface ConversationActionMemory {
  action: ActionName;

  parameters: Record<string, unknown>;

  resultEntityIds?: string[];

  resultEntityNames?: string[];

  query?: string;

  turnNumber?: number;

  timestamp?: string;
}


// =====================================================
// CHAT CONTEXT
// =====================================================
//
// High-level context passed between the chat pipeline.
//
// =====================================================

export interface ChatContext {
  conversationId?: string;

  userId?: string;

  profileId?: string;

  currentMessage?: string;

  previousMessage?: string;

  previousQuery?: string;

  entities?: ConversationEntity[];

  actions?: ConversationActionMemory[];

  lastAction?: ActionName;

  lastActionResult?: ActionResult;

  selectedEntity?: ConversationEntity;

  filters?: ProductFilters;

  metadata?: Record<string, unknown>;
}


// =====================================================
// ACTION RESPONSE FOR AI
// =====================================================
//
// This is a clean representation intended for the AI
// response-generation layer.
//
// Do NOT expose internal database errors directly to
// customers.
//
// =====================================================

export interface ActionResponseForAI {
  success: boolean;

  action: ActionName;

  message: string;

  data?: unknown;

  entities?: ActionEntity[];

  context?: ActionContext;
}


// =====================================================
// ACTION ERROR
// =====================================================

export interface ActionError {
  code:
    | "INVALID_ACTION"
    | "INVALID_PARAMETERS"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "RATE_LIMITED"
    | "TIMEOUT"
    | "STORE_ERROR"
    | "INTERNAL_ERROR";

  message: string;

  action?: ActionName;

  retryable?: boolean;

  details?: Record<string, unknown>;
}


// =====================================================
// ACTION CAPABILITY
// =====================================================
//
// Describes what an action can do.
//
// Useful later if you want the AI to dynamically know
// which tools are available.
//
// =====================================================

export interface ActionCapability {
  name: ActionName;

  description: string;

  parameterSchema?: Record<string, unknown>;

  requiresAuthentication?: boolean;

  requiresCustomerIdentity?: boolean;

  requiresStoreConnection?: boolean;
}


// =====================================================
// ACTION NAME GUARD
// =====================================================

export function isActionName(
  value: unknown
): value is ActionName {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return [
    "search_products",

    "get_product_details",
    "check_product_stock",
    "get_product_price",
    "get_product_variants",
    "get_product_recommendations",
    "compare_products",

    "get_order_status",
    "get_order_details",

    "get_shipping_policy",
    "get_return_policy",

    "handoff_to_human",
  ].includes(value);
}


// =====================================================
// ENTITY TYPE GUARD
// =====================================================

export function isEntityType(
  value: unknown
): value is EntityType {
  if (
    typeof value !== "string"
  ) {
    return false;
  }

  return [
    "product",
    "property",
    "menu_item",
    "service",
    "room",
    "doctor",
    "course",
    "order",
    "collection",
    "policy",
    "general",
    "unknown",
  ].includes(value);
}


// =====================================================
// ACTION REQUEST VALIDATION
// =====================================================
//
// Lightweight validation.
//
// This does not validate business logic.
// It only ensures the action structure is valid.
//
// =====================================================

export function isValidActionRequest(
  value: unknown
): value is ActionRequest {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const request =
    value as Record<string, unknown>;

  if (
    !isActionName(
      request.action
    )
  ) {
    return false;
  }

  if (
    !request.parameters ||
    typeof request.parameters !==
      "object" ||
    Array.isArray(
      request.parameters
    )
  ) {
    return false;
  }

  return true;
}


// =====================================================
// ACTION RESULT VALIDATION
// =====================================================

export function isValidActionResult(
  value: unknown
): value is ActionResult {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const result =
    value as Record<string, unknown>;

  return (
    typeof result.success ===
    "boolean"
  );
}


// =====================================================
// CREATE ACTION REQUEST
// =====================================================
//
// Convenience helper for your action detector.
//
// =====================================================

export function createActionRequest(
  action: ActionName,
  parameters: Record<string, unknown> = {},
  options?: {
    context?: ActionContext;

    priority?: ActionPriority;

    source?: ActionSource;

    confidence?: number;

    reasoning?: string;

    requestId?: string;
  }
): ActionRequest {
  return {
    action,

    parameters,

    ...(options?.context
      ? {
          context:
            options.context,
        }
      : {}),

    ...(options?.priority
      ? {
          priority:
            options.priority,
        }
      : {}),

    ...(options?.source
      ? {
          source:
            options.source,
        }
      : {}),

    ...(typeof options?.confidence ===
    "number"
      ? {
          confidence:
            Math.max(
              0,
              Math.min(
                1,
                options.confidence
              )
            ),
        }
      : {}),

    ...(options?.reasoning
      ? {
          reasoning:
            options.reasoning,
        }
      : {}),

    ...(options?.requestId
      ? {
          requestId:
            options.requestId,
        }
      : {}),
  };
}


// =====================================================
// CREATE ACTION RESULT
// =====================================================

export function createActionResult(
  success: boolean,
  options?: {
    data?: unknown;

    message?: string;

    error?: string;

    entities?: ActionEntity[];

    metadata?: ActionResultMetadata;

    context?: ActionContext;
  }
): ActionResult {
  return {
    success,

    ...(options?.data !== undefined
      ? {
          data:
            options.data,
        }
      : {}),

    ...(options?.message
      ? {
          message:
            options.message,
        }
      : {}),

    ...(options?.error
      ? {
          error:
            options.error,
        }
      : {}),

    ...(options?.entities
      ? {
          entities:
            options.entities,
        }
      : {}),

    ...(options?.metadata
      ? {
          metadata:
            options.metadata,
        }
      : {}),

    ...(options?.context
      ? {
          context:
            options.context,
        }
      : {}),
  };
}