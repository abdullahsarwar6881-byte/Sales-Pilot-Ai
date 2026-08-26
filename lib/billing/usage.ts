import {
  BILLING_PLANS,
  type BillingPlanId,
} from "@/lib/billing/plans";

// =====================================================
// CHECK CONVERSATION LIMIT
// =====================================================

export function canStartConversation(
  planId: BillingPlanId,
  conversationsUsed: number
): boolean {
  const plan = BILLING_PLANS[planId];

  const limit = plan.limits.conversations;

  if (limit <= 0) {
    return false;
  }

  return conversationsUsed < limit;
}

// =====================================================
// GET CONVERSATION LIMIT
// =====================================================

export function getConversationLimit(
  planId: BillingPlanId
): number {
  return BILLING_PLANS[planId].limits.conversations;
}

// =====================================================
// GET REMAINING CONVERSATIONS
// =====================================================

export function getRemainingConversations(
  planId: BillingPlanId,
  conversationsUsed: number
): number {
  const limit =
    getConversationLimit(planId);

  return Math.max(
    0,
    limit - conversationsUsed
  );
}

// =====================================================
// CHECK WEBSITE LIMIT
// =====================================================

export function canAddWebsite(
  planId: BillingPlanId,
  websitesUsed: number
): boolean {
  const limit =
    BILLING_PLANS[planId].limits.websites;

  return websitesUsed < limit;
}

// =====================================================
// GET WEBSITE LIMIT
// =====================================================

export function getWebsiteLimit(
  planId: BillingPlanId
): number {
  return BILLING_PLANS[planId].limits.websites;
}

// =====================================================
// GET REMAINING WEBSITES
// =====================================================

export function getRemainingWebsites(
  planId: BillingPlanId,
  websitesUsed: number
): number {
  const limit =
    getWebsiteLimit(planId);

  return Math.max(
    0,
    limit - websitesUsed
  );
}

// =====================================================
// CHECK KNOWLEDGE PAGE LIMIT
// =====================================================

export function canAddKnowledgePages(
  planId: BillingPlanId,
  knowledgePagesUsed: number,
  pagesToAdd: number = 1
): boolean {
  const limit =
    BILLING_PLANS[planId].limits.knowledgePages;

  return (
    knowledgePagesUsed + pagesToAdd <=
    limit
  );
}

// =====================================================
// GET KNOWLEDGE PAGE LIMIT
// =====================================================

export function getKnowledgePageLimit(
  planId: BillingPlanId
): number {
  return BILLING_PLANS[planId].limits.knowledgePages;
}

// =====================================================
// GET REMAINING KNOWLEDGE PAGES
// =====================================================

export function getRemainingKnowledgePages(
  planId: BillingPlanId,
  knowledgePagesUsed: number
): number {
  const limit =
    getKnowledgePageLimit(planId);

  return Math.max(
    0,
    limit - knowledgePagesUsed
  );
}

// =====================================================
// FEATURE ACCESS
// =====================================================

export function hasFeature(
  planId: BillingPlanId,
  feature: keyof (typeof BILLING_PLANS)[BillingPlanId]["features"]
): boolean {
  return Boolean(
    BILLING_PLANS[planId].features[feature]
  );
}

// =====================================================
// SHOPIFY ACCESS
// =====================================================

export function canUseShopify(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "shopifyIntegration"
  );
}

// =====================================================
// ORDER TRACKING ACCESS
// =====================================================

export function canUseOrderTracking(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "orderTracking"
  );
}

// =====================================================
// AI CUSTOMER ACTIONS ACCESS
// =====================================================

export function canUseCustomerActions(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "aiCustomerActions"
  );
}

// =====================================================
// PRODUCT RECOMMENDATIONS ACCESS
// =====================================================

export function canUseProductRecommendations(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "productRecommendations"
  );
}

// =====================================================
// ADVANCED SHOPIFY ACCESS
// =====================================================

export function canUseAdvancedShopify(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "advancedShopify"
  );
}

// =====================================================
// MULTIPLE KNOWLEDGE SOURCES ACCESS
// =====================================================

export function canUseMultipleKnowledgeSources(
  planId: BillingPlanId
): boolean {
  return hasFeature(
    planId,
    "multipleKnowledgeSources"
  );
}