export type BillingPlanId = "starter" | "growth" | "business";

export interface BillingPlan {
  id: BillingPlanId;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: "PKR";
  conversations: number;
  websites: number;
  knowledgePages: number;
  popular?: boolean;
  features: string[];
}

export const BILLING_PLANS: Record<BillingPlanId, BillingPlan> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small businesses getting started with AI support.",
    monthlyPrice: 2000,
    annualPrice: 20000,
    currency: "PKR",
    conversations: 50,
    websites: 1,
    knowledgePages: 500,

    features: [
      "1 website",
      "50 AI conversations/month",
      "AI customer support",
      "Website crawler",
      "Knowledge Base",
      "PDF, DOCX & TXT training",
      "Basic widget customization",
      "Basic analytics",
      "Sales Pilot branding",
    ],
  },

  growth: {
    id: "growth",
    name: "Growth",
    description: "For growing businesses that need more automation.",
    monthlyPrice: 4000,
    annualPrice: 40000,
    currency: "PKR",
    conversations: 300,
    websites: 1,
    knowledgePages: 2000,
    popular: true,

    features: [
      "1 website",
      "300 AI conversations/month",
      "Everything in Starter",
      "Shopify integration",
      "Product & inventory knowledge",
      "Order tracking",
      "AI customer actions",
      "Advanced widget customization",
      "Advanced analytics",
      "Remove Sales Pilot branding",
      "Priority support",
    ],
  },

  business: {
    id: "business",
    name: "Business",
    description:
      "For businesses with higher support volume and automation needs.",
    monthlyPrice: 6000,
    annualPrice: 60000,
    currency: "PKR",
    conversations: 1000,
    websites: 3,
    knowledgePages: 10000,

    features: [
      "Up to 3 websites",
      "1,000 AI conversations/month",
      "Everything in Growth",
      "Advanced Shopify automation",
      "Order status support",
      "Product recommendations",
      "Return & refund information",
      "Multiple knowledge sources",
      "Advanced AI behavior",
      "Advanced analytics",
      "Priority support",
      "No Sales Pilot branding",
    ],
  },
};

export function getBillingPlan(planId: BillingPlanId) {
  return BILLING_PLANS[planId];
}