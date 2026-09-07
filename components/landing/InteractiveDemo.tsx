"use client";

import React, { useState } from "react";
import {
  Bot,
  User,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Truck,
  HelpCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface DemoScenario {
  id: string;
  category: string;
  userPrompt: string;
  aiResponse: string;
  hasProduct?: boolean;
  productData?: {
    title: string;
    price: string;
    badge: string;
    stock: string;
  };
  hasOrder?: boolean;
  orderData?: {
    orderNumber: string;
    status: string;
    carrier: string;
    eta: string;
  };
  citation?: string;
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "product",
    category: "Product Recommendation",
    userPrompt: "I'm looking for an embroidered party dress under $100. What do you recommend?",
    aiResponse:
      "Here is our top-rated option from our new collection! It features detailed embroidery, premium fabric, and is ready for immediate dispatch in your price range:",
    hasProduct: true,
    productData: {
      title: "Embroidered Chiffon 3-Piece Suite",
      price: "$89.00",
      badge: "In Stock • Ships in 24h",
      stock: "Available in S, M, L",
    },
    citation: "Indexed from store collection: New Arrivals / Festive",
  },
  {
    id: "order",
    category: "Order Tracking",
    userPrompt: "Can you check the status of my order #8192?",
    aiResponse:
      "I found your order! It was dispatched yesterday and is currently in transit with express delivery:",
    hasOrder: true,
    orderData: {
      orderNumber: "#8192",
      status: "In Transit • On Schedule",
      carrier: "DHL Express (Tracking: #9821389)",
      eta: "Estimated Delivery: Tomorrow by 4:00 PM",
    },
    citation: "Real-time order lookup integration",
  },
  {
    id: "policy",
    category: "Return Policy & Shipping",
    userPrompt: "What is your return policy and do you ship internationally?",
    aiResponse:
      "We offer a 30-day hassle-free return window on all unworn items with original tags. Yes! We ship worldwide with free standard shipping on all orders over $75. Returns are processed within 48 hours of receipt.",
    citation: "Indexed from store policy: /pages/returns & /pages/shipping",
  },
  {
    id: "size",
    category: "Size & Fit Guidance",
    userPrompt: "How does the sizing run for your linen tops? Should I size up?",
    aiResponse:
      "Our linen collection has a true-to-size, relaxed tailored fit. If you prefer an oversized breezy silhouette, we recommend sizing up one size. You can also view our exact size chart measurements for bust and waist.",
    citation: "Indexed from store size chart: /pages/sizing-guide",
  },
];

export function InteractiveDemo() {
  const [activeScenarioId, setActiveScenarioId] = useState<string>("product");
  const currentScenario =
    DEMO_SCENARIOS.find((s) => s.id === activeScenarioId) || DEMO_SCENARIOS[0];

  return (
    <section id="demo" className="py-20 lg:py-28 bg-slate-50/70 dark:bg-[#080808]/70 relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-violet-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Interactive Live Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            See how Sales Pilot handles{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600">
              real customer conversations
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
            Click any scenario below to test how your AI employee instantly answers questions, recommends items, and closes sales using verified store knowledge.
          </p>
        </div>

        {/* Interactive Demo Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Scenario Selectors */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1 mb-2">
              Select a Customer Inquiry
            </div>
            {DEMO_SCENARIOS.map((scenario) => {
              const isSelected = scenario.id === activeScenarioId;
              return (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenarioId(scenario.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${
                    isSelected
                      ? "bg-white dark:bg-[#141414] border-indigo-500 shadow-md shadow-indigo-500/10 ring-2 ring-indigo-500/20"
                      : "bg-white/60 dark:bg-[#0f0f0f]/60 hover:bg-white dark:hover:bg-[#141414] border-slate-200/80 dark:border-white/5 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {scenario.category}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                  <div
                    className={`text-sm font-semibold line-clamp-2 ${
                      isSelected
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    "{scenario.userPrompt}"
                  </div>
                </button>
              );
            })}

            <div className="pt-3">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Zero Hallucinations Guarantee</span>
                </div>
                <p className="text-xs text-indigo-700 dark:text-indigo-300/80 mt-1">
                  Sales Pilot only responds using your exact crawled website pages, policies, and products.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Live Simulated Chat Widget Frame */}
          <div className="lg:col-span-8 bg-white dark:bg-[#101010] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col min-h-[460px]">
            {/* Simulator Header */}
            <div className="px-6 py-4 bg-slate-50/90 dark:bg-[#161616] border-b border-slate-200/70 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Sales Pilot AI Assistant
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
                      Active
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Trained on your website & catalog
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Response Time: 0.6s</span>
              </div>
            </div>

            {/* Conversation Area */}
            <div className="p-6 flex-1 space-y-4 flex flex-col justify-center">
              {/* Customer Bubble */}
              <div className="flex items-start justify-end gap-2.5">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 max-w-[80%] text-sm font-medium shadow-sm">
                  {currentScenario.userPrompt}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 text-xs font-bold">
                  <User className="w-4 h-4" />
                </div>
              </div>

              {/* AI Bubble */}
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-3 max-w-[85%]">
                  <div className="bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-xs px-4 py-3 text-sm font-normal leading-relaxed">
                    {currentScenario.aiResponse}
                  </div>

                  {/* Optional Product Card */}
                  {currentScenario.hasProduct && currentScenario.productData && (
                    <div className="bg-white dark:bg-[#181818] rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-3.5 shadow-md flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950 dark:to-violet-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {currentScenario.productData.badge}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {currentScenario.productData.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {currentScenario.productData.stock}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                          {currentScenario.productData.price}
                        </div>
                        <button
                          type="button"
                          className="mt-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Optional Order Tracking Card */}
                  {currentScenario.hasOrder && currentScenario.orderData && (
                    <div className="bg-white dark:bg-[#181818] rounded-2xl border border-slate-200 dark:border-white/10 p-3.5 shadow-md space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-indigo-600" />
                          Order {currentScenario.orderData.orderNumber}
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          {currentScenario.orderData.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        {currentScenario.orderData.carrier}
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {currentScenario.orderData.eta}
                      </div>
                    </div>
                  )}

                  {/* Citation verification tag */}
                  {currentScenario.citation && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{currentScenario.citation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Simulator Bottom Quick Try */}
            <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-[#141414] border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Want to test your own store's questions?
              </span>
              <a
                href="/signup"
                className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1"
              >
                <span>Start Free 3-Day Trial</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
