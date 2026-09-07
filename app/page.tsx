"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bot,
  ArrowRight,
  MessageSquare,
  ShoppingCart,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Globe,
  Sliders,
  BarChart3,
  Search,
  Headphones,
  Check,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { HeroDashboardVisual } from "@/components/landing/HeroDashboardVisual";
import { InteractiveDemo } from "@/components/landing/InteractiveDemo";
import { FaqAccordion } from "@/components/landing/FaqAccordion";

export default function LandingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#070707] text-slate-900 dark:text-[#F5F5F5] selection:bg-indigo-500 selection:text-white transition-colors duration-200 overflow-x-hidden font-sans">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-indigo-50/70 via-purple-50/40 to-transparent dark:from-purple-950/20 dark:via-indigo-950/10 dark:to-transparent blur-3xl rounded-full" />
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white dark:bg-[#141414] text-indigo-600 dark:text-indigo-400 border border-slate-200/90 dark:border-white/10 shadow-xs">
              <span className="text-indigo-600 dark:text-indigo-400 text-sm">✦</span>
              <span>Your AI employee, working 24/7</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              Your AI Employee for{" "}
              <span className="block text-[#5B3DF5] dark:text-[#7C5CFC]">
                Sales &amp; Customer
              </span>
              <span className="block text-[#5B3DF5] dark:text-[#7C5CFC]">
                Support
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl font-normal leading-relaxed">
              Train AI on your business in minutes. Sales Pilot answers customer questions, recommends products, captures leads, and supports your customers 24/7.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-bold text-white bg-[#5B3DF5] hover:bg-[#4E2DE8] dark:bg-[#6D4BF7] dark:hover:bg-[#5B3DF5] shadow-lg shadow-[#5B3DF5]/25 hover:shadow-[#5B3DF5]/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200"
              >
                <span>Start Free 3-Day Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#demo"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-[#141414] dark:hover:bg-[#1e1e1e] border border-slate-200/80 dark:border-white/10 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                View Demo
              </a>
            </div>

            {/* Subtext under CTA */}
            <p className="text-xs text-slate-400 dark:text-slate-500 pt-1 font-medium">
              No credit card required. Cancel anytime.
            </p>

            {/* Trust Section */}
            <div className="pt-8 sm:pt-10">
              <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-4">
                Trusted by growing ecommerce businesses
              </div>
              <div className="flex flex-wrap items-center gap-6 sm:gap-8 opacity-70 grayscale dark:invert transition-all">
                {/* Shopify */}
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.64 6.78c-.04-.2-.17-.37-.36-.45l-3.32-1.42c-.22-.09-.47-.04-.63.12L13.8 6.57c-.2.2-.5.26-.77.15l-4.22-1.8c-.14-.06-.3-.06-.44 0L4.72 6.64c-.2.09-.33.28-.35.5-.02.21.08.42.26.54l7.14 4.88c.14.09.31.14.48.14.17 0 .34-.05.48-.14l6.64-4.54c.18-.12.29-.32.27-.54zm-7.4 6.13l-6.2-4.24v6.86c0 .24.12.46.33.58l5.54 3.2c.2.12.45.12.66 0l5.54-3.2c.21-.12.33-.34.33-.58V8.67l-6.2 4.24z" />
                  </svg>
                  <span>shopify</span>
                </div>

                {/* WooCommerce */}
                <div className="flex items-center gap-1 font-bold text-slate-800 text-xs tracking-wider">
                  <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                    WOO
                  </span>
                  <span>COMMERCE</span>
                </div>

                {/* Squarespace */}
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs tracking-wider">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2v-2h2v2zm0-4h-2V7h2v5.5z" />
                  </svg>
                  <span>SQUARESPACE</span>
                </div>

                {/* Wix */}
                <div className="font-black text-slate-800 text-sm tracking-widest">
                  WiX
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Dashboard Mockup + Overlay Widget + Floating Cards */}
          <div className="lg:col-span-6 relative mt-4 lg:mt-0">
            <HeroDashboardVisual />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4-COLUMN FEATURE STRIP (Matching the Reference Screenshot) */}
        {/* ========================================================================= */}
        <div className="mt-14 sm:mt-20 bg-white dark:bg-[#0e0e0e] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-xl p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:divide-x lg:divide-slate-100 dark:lg:divide-white/5">
            {/* 1. Answer Questions */}
            <div className="flex items-start gap-4 lg:px-4 first:lg:pl-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Answer Questions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  Provide instant, accurate answers from your data.
                </p>
              </div>
            </div>

            {/* 2. Recommend Products */}
            <div className="flex items-start gap-4 lg:px-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Recommend Products
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  Help customers find the right products.
                </p>
              </div>
            </div>

            {/* 3. Capture Leads */}
            <div className="flex items-start gap-4 lg:px-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Capture Leads
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  Turn visitors into paying customers.
                </p>
              </div>
            </div>

            {/* 4. Support 24/7 */}
            <div className="flex items-start gap-4 lg:px-4">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-[#5B3DF5] dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Support 24/7
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                  Never miss a customer with always-on support.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FEATURES BENTO SECTION */}
      {/* ========================================================================= */}
      <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Engineered for Revenue &amp; Support</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Everything your store needs to{" "}
            <span className="text-[#5B3DF5] dark:text-[#7C5CFC]">
              sell and support on autopilot
            </span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
            No complex setup, no manual prompt writing. Sales Pilot acts as an intelligent team member trained directly on your store.
          </p>
        </div>

        {/* Feature Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Card 1: Website Knowledge Sync */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Instant Website Knowledge Sync
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Just enter your website URL. Sales Pilot automatically indexes pages, catalog items, policies, and FAQs in minutes.
            </p>
          </div>

          {/* Card 2: Conversational Sales & Cart Add */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Product Recommendations &amp; Cart
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Recommends the right products based on customer budget, sizes, and colors, complete with instant buy buttons.
            </p>
          </div>

          {/* Card 3: Zero-Hallucination Guardrails */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Verified Data &amp; Zero Hallucinations
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Sales Pilot answers strictly from your verified business data, citing exact pages with complete factual accuracy.
            </p>
          </div>

          {/* Card 4: 24/7 Automated Support */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Always-On 24/7 Customer Support
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Never lose an international or late-night shopper again. Instant replies in under 1 second, day or night.
            </p>
          </div>

          {/* Card 5: Customizable Widget Studio */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Customizable Widget Studio
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Match your brand typography, colors, avatars, greeting messages, and quick-prompt suggestion chips in real time.
            </p>
          </div>

          {/* Card 6: Multi-Format Knowledge Base */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0e0e0e] border border-slate-200/90 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Conversation Analytics &amp; Search
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              Review visitor questions, track customer satisfaction, search message transcripts, and optimize your knowledge base.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HOW IT WORKS SECTION */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50/70 dark:bg-[#080808]/70 border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4">
              <span>Simple 3-Step Setup</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Up and running in{" "}
              <span className="text-[#5B3DF5] dark:text-[#7C5CFC]">less than 3 minutes</span>
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
              No developer required. Connect your site, configure your brand settings, and embed.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-md relative">
              <div className="text-4xl font-black text-indigo-600/20 dark:text-indigo-400/20 mb-4">
                01
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Connect Your Website
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Paste your website URL or sitemap. Our high-speed crawler indexes your products, policies, and FAQs automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-md relative">
              <div className="text-4xl font-black text-indigo-600/20 dark:text-indigo-400/20 mb-4">
                02
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Customize in Widget Studio
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Personalize your brand colors, AI avatar, welcome messages, quick suggestion chips, and conversation tone.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-[#111111] p-8 rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-md relative">
              <div className="text-4xl font-black text-indigo-600/20 dark:text-indigo-400/20 mb-4">
                03
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                Embed &amp; Watch Sales Grow
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Copy one simple script tag to your store. Your 24/7 AI employee immediately begins assisting visitors and closing orders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* INTERACTIVE DEMO SIMULATOR */}
      {/* ========================================================================= */}
      <InteractiveDemo />

      {/* ========================================================================= */}
      {/* PRICING SECTION */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4">
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Plans for stores of{" "}
            <span className="text-[#5B3DF5] dark:text-[#7C5CFC]">every size</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
            Start with our 3-day free trial. Upgrade or cancel anytime.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-slate-100 dark:bg-[#141414] border border-slate-200/80 dark:border-white/10 text-xs font-bold">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-xl transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-[#202020] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-white dark:bg-[#202020] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Plan 1: Starter */}
          <div className="bg-white dark:bg-[#0e0e0e] rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 shadow-md flex flex-col justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                Starter
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                Perfect for getting started with AI customer support.
              </div>
              <div className="mt-6 mb-6">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {billingCycle === "annual" ? "Rs. 1,600" : "Rs. 2,000"}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">/ month</span>
                {billingCycle === "annual" && (
                  <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Billed annually
                  </div>
                )}
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>50 AI conversations / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>1 website</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>AI customer support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Website crawler</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Knowledge Base</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>PDF, DOCX &amp; TXT training</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>FAQ support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Product recommendations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Basic widget customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Conversation history &amp; basic analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Email support</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Check className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Sales Pilot branding</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full text-center py-3.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] transition-colors"
            >
              Start Free 3-Day Trial
            </Link>
          </div>

          {/* Plan 2: Growth (MOST POPULAR) */}
          <div className="bg-white dark:bg-[#111111] rounded-3xl border-2 border-[#5B3DF5] p-8 shadow-xl relative flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#5B3DF5] text-white shadow-md">
              MOST POPULAR
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                Growth
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                For growing businesses that need more powerful AI support.
              </div>
              <div className="mt-6 mb-6">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {billingCycle === "annual" ? "Rs. 3,200" : "Rs. 4,000"}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">/ month</span>
                {billingCycle === "annual" && (
                  <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Billed annually
                  </div>
                )}
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>300 AI conversations / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>1 website</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-[#5B3DF5] dark:text-indigo-400">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Everything in Starter</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Shopify integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Product &amp; inventory knowledge</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Order tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Order-related actions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Advanced widget customization</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Conversation search</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-[#5B3DF5] shrink-0" />
                  <span>No Sales Pilot branding</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full text-center py-3.5 rounded-xl text-sm font-bold text-white bg-[#5B3DF5] hover:bg-[#4E2DE8] shadow-md shadow-[#5B3DF5]/30 transition-all hover:-translate-y-0.5"
            >
              Start Free 3-Day Trial
            </Link>
          </div>

          {/* Plan 3: Business */}
          <div className="bg-white dark:bg-[#0e0e0e] rounded-3xl border border-slate-200/90 dark:border-white/10 p-8 shadow-md flex flex-col justify-between">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                Business
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                For businesses that need higher limits and advanced automation.
              </div>
              <div className="mt-6 mb-6">
                <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                  {billingCycle === "annual" ? "Rs. 4,800" : "Rs. 6,000"}
                </span>
                <span className="text-xs font-semibold text-slate-500 ml-1">/ month</span>
                {billingCycle === "annual" && (
                  <div className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    Billed annually
                  </div>
                )}
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">
                <li className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>1,000 AI conversations / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Up to 3 websites</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-indigo-600 dark:text-indigo-400">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Everything in Growth</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Shopify automation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Order status support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Product recommendations</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Returns &amp; refunds support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Multiple knowledge sources</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom AI behavior</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Higher usage limits</span>
                </li>
                <li className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>No Sales Pilot branding</span>
                </li>
              </ul>
            </div>
            <Link
              href="/signup"
              className="mt-8 w-full text-center py-3.5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-[#181818] dark:hover:bg-[#222222] transition-colors"
            >
              Start Free 3-Day Trial
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 lg:py-28 bg-slate-50/70 dark:bg-[#080808]/70 border-t border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 mb-4">
              <span>Got Questions?</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal">
              Everything you need to know about setting up and growing with Sales Pilot.
            </p>
          </div>

          <FaqAccordion />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FINAL HIGH IMPACT CTA */}
      {/* ========================================================================= */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-tr from-[#5B3DF5] via-indigo-600 to-violet-600 text-white p-10 sm:p-16 text-center shadow-2xl overflow-hidden">
          {/* Decorative background circle glows */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to hire your 24/7 AI employee?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-indigo-100 max-w-xl mx-auto">
            Join hundreds of ecommerce stores increasing conversion and delighting customers with Sales Pilot.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-white text-[#5B3DF5] hover:bg-slate-50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200"
            >
              Start Free 3-Day Trial →
            </Link>
          </div>

          <p className="mt-4 text-xs text-indigo-200 font-medium">
            Setup takes less than 3 minutes • No credit card required • Cancel anytime
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#050505] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
              S
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">
              Sales Pilot
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
            <a href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">
              How It Works
            </a>
            <a href="#demo" className="hover:text-indigo-600 transition-colors">
              Demo
            </a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </a>
            <a href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </a>
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            &copy; {new Date().getFullYear()} Sales Pilot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}