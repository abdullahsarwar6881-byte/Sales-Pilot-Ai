// =====================================================
// SALES PILOT BILLING PLANS
// =====================================================

export const PLANS = {
  // ===================================================
  // STARTER
  // ===================================================

  starter: {
    id: "starter",

    name: "Starter",

    // Safepay recurring plan ID
    safepayPlanId:
      "plan_ab2bb1e9-8c01-4ecc-964c-778ecb1cc5ee",

    price: 2000,

    currency: "PKR",

    billingCycle: "monthly",

    limits: {
      websites: 1,

      conversations: 50,

      knowledgePages: 100,
    },

    features: {
      aiCustomerSupport: true,

      websiteCrawler: true,

      knowledgeBase: true,

      documentTraining: true,

      basicWidget: true,

      basicAnalytics: true,

      shopifyIntegration: false,

      productInventoryKnowledge: false,

      orderTracking: false,

      aiCustomerActions: false,

      advancedWidget: false,

      advancedAnalytics: false,

      advancedShopify: false,

      productRecommendations: false,

      returnRefundInfo: false,

      multipleKnowledgeSources: false,
    },
  },

  // ===================================================
  // GROWTH
  // ===================================================

  growth: {
    id: "growth",

    name: "Growth",

    // Safepay recurring plan ID
    safepayPlanId:
      "plan_5f4fc32e-694b-46b6-a677-0883de872e74",

    price: 4000,

    currency: "PKR",

    billingCycle: "monthly",

    limits: {
      websites: 1,

      conversations: 300,

      knowledgePages: 500,
    },

    features: {
      aiCustomerSupport: true,

      websiteCrawler: true,

      knowledgeBase: true,

      documentTraining: true,

      basicWidget: true,

      basicAnalytics: true,

      shopifyIntegration: true,

      productInventoryKnowledge: true,

      orderTracking: true,

      aiCustomerActions: true,

      advancedWidget: true,

      advancedAnalytics: true,

      advancedShopify: false,

      productRecommendations: false,

      returnRefundInfo: false,

      multipleKnowledgeSources: false,
    },
  },

  // ===================================================
  // BUSINESS
  // ===================================================

  business: {
    id: "business",

    name: "Business",

    // Safepay recurring plan ID
    safepayPlanId:
      "plan_210f2e11-7361-4b94-999d-4a7942f656d4",

    price: 6000,

    currency: "PKR",

    billingCycle: "monthly",

    limits: {
      websites: 3,

      conversations: 1000,

      knowledgePages: 2000,
    },

    features: {
      aiCustomerSupport: true,

      websiteCrawler: true,

      knowledgeBase: true,

      documentTraining: true,

      basicWidget: true,

      basicAnalytics: true,

      shopifyIntegration: true,

      productInventoryKnowledge: true,

      orderTracking: true,

      aiCustomerActions: true,

      advancedWidget: true,

      advancedAnalytics: true,

      advancedShopify: true,

      productRecommendations: true,

      returnRefundInfo: true,

      multipleKnowledgeSources: true,
    },
  },
} as const;

// =====================================================
// PLAN TYPES
// =====================================================

export type PlanId = keyof typeof PLANS;

// Backward-compatible name used by existing billing files.
export type BillingPlanId = PlanId;

// =====================================================
// BILLING PLANS
// =====================================================
//
// Existing billing components use BILLING_PLANS.
// Keep this alias for compatibility.
//

export const BILLING_PLANS = PLANS;

// =====================================================
// GET BILLING PLAN
// =====================================================

export function getBillingPlan(
  planId: BillingPlanId
) {
  return PLANS[planId];
}

// =====================================================
// GET SAFEPAY PLAN ID
// =====================================================

export function getSafepayPlanId(
  planId: BillingPlanId
): string {
  return PLANS[planId].safepayPlanId;
}

// =====================================================
// PLAN VALIDATION
// =====================================================

export function isValidPlanId(
  value: string
): value is PlanId {
  return value in PLANS;
}

// =====================================================
// GET PLAN
// =====================================================

export function getPlan(
  planId: PlanId
) {
  return PLANS[planId];
}

// =====================================================
// DEFAULT PLAN
// =====================================================

export const DEFAULT_PLAN_ID: PlanId =
  "starter";

// =====================================================
// FEATURE TYPE
// =====================================================

export type PlanFeatures =
  (typeof PLANS)[PlanId]["features"];

// =====================================================
// LIMIT TYPE
// =====================================================

export type PlanLimits =
  (typeof PLANS)[PlanId]["limits"];

// =====================================================
// SAFEPAY PLAN TYPE
// =====================================================

export type SafepayPlanId =
  (typeof PLANS)[PlanId]["safepayPlanId"];