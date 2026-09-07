"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How long does it take to set up Sales Pilot?",
    answer:
      "Under 5 minutes. You simply enter your website URL or sitemap. Sales Pilot's automated crawler indexes your pages, product catalog, FAQs, and store policies, generates high-accuracy AI embeddings, and provides a lightweight embed code ready to paste onto your website.",
  },
  {
    question: "Can Sales Pilot answer specific product, sizing, and policy questions?",
    answer:
      "Yes! Sales Pilot learns your complete product inventory, sizes, materials, prices, return policies, and shipping rates. It understands customer context, recommends matching items, and shares exact answers directly from your verified business data.",
  },
  {
    question: "Does it work with any website or ecommerce store?",
    answer:
      "Yes. Sales Pilot is built for modern websites and ecommerce stores, including Shopify, WooCommerce, Squarespace, Wix, Webflow, and custom React/Next.js/HTML sites. You just copy a single script tag into your website.",
  },
  {
    question: "What happens if the AI encounters a question it cannot answer?",
    answer:
      "Sales Pilot has a strict zero-hallucination policy. If a question is outside your store's verified knowledge or requires manual intervention, it gracefully captures the customer's contact details or offers a smooth human handoff to your support team.",
  },
  {
    question: "Can I customize the widget to match my brand colors and tone?",
    answer:
      "Absolutely. Inside the Widget Studio, you can customize your brand colors, primary gradients, greeting messages, quick-reply chips, AI avatar, tone of voice, and widget position on desktop and mobile.",
  },
  {
    question: "Is a credit card required for the 3-day free trial?",
    answer:
      "No credit card is required. You can sign up, crawl your website, test the AI in Widget Studio, and embed the widget on your live store with full access for 3 days. Cancel anytime with a single click.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={index}
            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0e0e0e] shadow-xs overflow-hidden transition-all duration-200"
          >
            <button
              onClick={() => toggleFaq(index)}
              className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-expanded={isOpen}
            >
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {item.question}
              </span>
              <div
                className={`w-8 h-8 rounded-full bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400" : ""
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {isOpen && (
              <div className="px-6 pb-5 pt-1 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-white/5">
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
