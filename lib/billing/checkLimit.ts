import {
  PLANS,
  type PlanId,
} from "@/lib/billing/plans";

// =====================================================
// CHECK CONVERSATION LIMIT
// =====================================================

export function canStartConversation(
  planId: PlanId,
  conversationsUsed: number
): boolean {
  const plan = PLANS[planId];

  const conversationLimit =
    plan.limits.conversations;

  return conversationsUsed < conversationLimit;
}

// =====================================================
// GET CONVERSATION LIMIT
// =====================================================

export function getConversationLimit(
  planId: PlanId
): number {
  return PLANS[planId].limits.conversations;
}

// =====================================================
// GET REMAINING CONVERSATIONS
// =====================================================

export function getRemainingConversations(
  planId: PlanId,
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
  planId: PlanId,
  websitesUsed: number
): boolean {
  const websiteLimit =
    PLANS[planId].limits.websites;

  return websitesUsed < websiteLimit;
}

// =====================================================
// GET WEBSITE LIMIT
// =====================================================

export function getWebsiteLimit(
  planId: PlanId
): number {
  return PLANS[planId].limits.websites;
}

// =====================================================
// GET REMAINING WEBSITES
// =====================================================

export function getRemainingWebsites(
  planId: PlanId,
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
  planId: PlanId,
  knowledgePagesUsed: number,
  pagesToAdd: number = 1
): boolean {
  const knowledgePageLimit =
    PLANS[planId].limits.knowledgePages;

  return (
    knowledgePagesUsed + pagesToAdd <=
    knowledgePageLimit
  );
}

// =====================================================
// GET KNOWLEDGE PAGE LIMIT
// =====================================================

export function getKnowledgePageLimit(
  planId: PlanId
): number {
  return PLANS[planId].limits.knowledgePages;
}

// =====================================================
// GET REMAINING KNOWLEDGE PAGES
// =====================================================

export function getRemainingKnowledgePages(
  planId: PlanId,
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
  planId: PlanId,
  feature: keyof (typeof PLANS)[PlanId]["features"]
): boolean {
  return Boolean(
    PLANS[planId].features[feature]
  );
}

// =====================================================
// SHOPIFY ACCESS
// =====================================================

export function canUseShopify(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "shopifyIntegration"
  );
}

// =====================================================
// PRODUCT & INVENTORY KNOWLEDGE
// =====================================================

export function canUseProductInventoryKnowledge(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "productInventoryKnowledge"
  );
}

// =====================================================
// ORDER TRACKING
// =====================================================

export function canUseOrderTracking(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "orderTracking"
  );
}

// =====================================================
// AI CUSTOMER ACTIONS
// =====================================================

export function canUseCustomerActions(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "aiCustomerActions"
  );
}

// =====================================================
// ADVANCED WIDGET
// =====================================================

export function canUseAdvancedWidget(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "advancedWidget"
  );
}

// =====================================================
// ADVANCED ANALYTICS
// =====================================================

export function canUseAdvancedAnalytics(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "advancedAnalytics"
  );
}

// =====================================================
// ADVANCED SHOPIFY
// =====================================================

export function canUseAdvancedShopify(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "advancedShopify"
  );
}

// =====================================================
// PRODUCT RECOMMENDATIONS
// =====================================================

export function canUseProductRecommendations(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "productRecommendations"
  );
}

// =====================================================
// RETURN & REFUND INFORMATION
// =====================================================

export function canUseReturnRefundInfo(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "returnRefundInfo"
  );
}

// =====================================================
// MULTIPLE KNOWLEDGE SOURCES
// =====================================================

export function canUseMultipleKnowledgeSources(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "multipleKnowledgeSources"
  );
}

// =====================================================
// BASIC WIDGET
// =====================================================

export function canUseBasicWidget(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "basicWidget"
  );
}

// =====================================================
// BASIC ANALYTICS
// =====================================================

export function canUseBasicAnalytics(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "basicAnalytics"
  );
}

// =====================================================
// WEBSITE CRAWLER
// =====================================================

export function canUseWebsiteCrawler(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "websiteCrawler"
  );
}

// =====================================================
// KNOWLEDGE BASE
// =====================================================

export function canUseKnowledgeBase(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "knowledgeBase"
  );
}

// =====================================================
// DOCUMENT TRAINING
// =====================================================

export function canUseDocumentTraining(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "documentTraining"
  );
}

// =====================================================
// AI CUSTOMER SUPPORT
// =====================================================

export function canUseAICustomerSupport(
  planId: PlanId
): boolean {
  return hasFeature(
    planId,
    "aiCustomerSupport"
  );
}