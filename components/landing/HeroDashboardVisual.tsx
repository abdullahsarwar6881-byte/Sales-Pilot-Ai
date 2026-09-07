"use client";

import React from "react";
import {
  ShoppingCart,
  Zap,
  Headphones,
  Bot,
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Sliders,
  BarChart3,
  Settings,
  Paperclip,
  Smile,
  Send,
  MoreHorizontal,
  Minus,
} from "lucide-react";

export function HeroDashboardVisual() {
  return (
    <div className="relative w-full max-w-[660px] lg:max-w-none mx-auto select-none pt-6 pb-8">
      {/* Subtle Background Glow and Decorative Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-purple-400/20 via-indigo-400/20 to-violet-300/15 blur-[90px] rounded-full pointer-events-none -z-10" />

      {/* Decorative dots matrix behind top-left */}
      <div className="absolute top-12 -left-6 grid grid-cols-5 gap-2 opacity-30 pointer-events-none hidden sm:grid">
        {Array.from({ length: 25 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
        ))}
      </div>

      {/* Floating Badge 1: Increase Sales (Top Right) */}
      <div className="absolute -top-1 sm:-top-3 right-0 sm:right-4 z-30 bg-white dark:bg-[#141414] rounded-2xl py-3 px-4 shadow-xl border border-slate-100 dark:border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-900 dark:text-white">
            Increase sales
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Recommend the right products
          </div>
        </div>
      </div>

      {/* Floating Badge 2: Capture Leads (Bottom Left) */}
      <div className="absolute -bottom-3 left-0 sm:left-4 z-30 bg-white dark:bg-[#141414] rounded-2xl py-3 px-4 shadow-xl border border-slate-100 dark:border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 fill-purple-600/20" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-900 dark:text-white">
            Capture leads
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Turn visitors into customers
          </div>
        </div>
      </div>

      {/* Floating Badge 3: Support 24/7 (Bottom Right) */}
      <div className="absolute -bottom-4 right-12 sm:right-28 z-30 bg-white dark:bg-[#141414] rounded-2xl py-3 px-4 shadow-xl border border-slate-100 dark:border-white/10 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Headphones className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-extrabold text-slate-900 dark:text-white">
            Support 24/7
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Answer instantly
          </div>
        </div>
      </div>

      {/* Main Dashboard Window Mockup */}
      <div className="relative bg-white dark:bg-[#0c0c0c] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden pb-4">
        {/* Window Top Controls */}
        <div className="h-9 bg-slate-50/90 dark:bg-[#141414] border-b border-slate-100 dark:border-white/5 px-4 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-12 min-h-[390px]">
          {/* Inner Sidebar */}
          <div className="col-span-3 border-r border-slate-100 dark:border-white/5 p-3.5 hidden sm:block">
            {/* Brand in sidebar */}
            <div className="flex items-center gap-2 mb-4 px-1">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                S
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Sales Pilot
              </span>
            </div>

            {/* Nav items */}
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Conversations</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Knowledge</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400">
                <Sliders className="w-3.5 h-3.5" />
                <span>Widget Studio</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400">
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl font-medium text-slate-500 dark:text-slate-400">
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </div>
            </div>
          </div>

          {/* Main Dashboard Area */}
          <div className="col-span-12 sm:col-span-9 p-4 sm:p-5 pr-4 sm:pr-[170px]">
            {/* Greeting */}
            <div className="mb-4">
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                Good morning, Saim <span className="text-base">👋</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your AI employee is ready to help your business grow.
              </p>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#141414] border border-slate-100 dark:border-white/5">
                <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                  Total Conversations
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  1,248
                </div>
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ↑ +12%
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#141414] border border-slate-100 dark:border-white/5">
                <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                  Leads Captured
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  312
                </div>
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ↑ +18%
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-50/90 dark:bg-[#141414] border border-slate-100 dark:border-white/5">
                <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">
                  Customer Satisfaction
                </div>
                <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  96%
                </div>
                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  ↑ +6%
                </div>
              </div>
            </div>

            {/* Lower area: Recent Conversations & Analytics Chart */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Recent Conversations List */}
              <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#141414] border border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                    Recent Conversations
                  </span>
                  <span className="text-[10px] text-slate-400">›</span>
                </div>

                <div className="space-y-2">
                  {/* Sarah M */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[8px]">
                        SM
                      </div>
                      <div className="truncate max-w-[95px]">
                        <div className="font-bold text-slate-900 dark:text-white">Sarah M.</div>
                        <div className="text-slate-400 truncate">Do you have this in a size M?</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-indigo-600 text-white">
                        New
                      </span>
                      <div className="text-[8px] text-slate-400 mt-0.5">2 min ago</div>
                    </div>
                  </div>

                  {/* James L */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[8px]">
                        JL
                      </div>
                      <div className="truncate max-w-[95px]">
                        <div className="font-bold text-slate-900 dark:text-white">James L.</div>
                        <div className="text-slate-400 truncate">What's your return policy?</div>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-400">12 min ago</div>
                  </div>

                  {/* Emma T */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center text-[8px]">
                        ET
                      </div>
                      <div className="truncate max-w-[95px]">
                        <div className="font-bold text-slate-900 dark:text-white">Emma T.</div>
                        <div className="text-slate-400 truncate">Can I track my order?</div>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-400">24 min ago</div>
                  </div>

                  {/* Michael R */}
                  <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[8px]">
                        MR
                      </div>
                      <div className="truncate max-w-[95px]">
                        <div className="font-bold text-slate-900 dark:text-white">Michael R.</div>
                        <div className="text-slate-400 truncate">Is this product in stock?</div>
                      </div>
                    </div>
                    <div className="text-[8px] text-slate-400">1 hour ago</div>
                  </div>
                </div>
              </div>

              {/* Conversations This Week Chart */}
              <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-[#141414] border border-slate-100 dark:border-white/5 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-900 dark:text-white mb-2">
                    Conversations This Week
                  </div>

                  {/* Tooltip highlight */}
                  <div className="inline-block bg-white dark:bg-[#1e1e1e] px-2 py-1 rounded-md shadow-xs border border-slate-200/80 dark:border-white/10 text-[9px] font-bold text-slate-800 dark:text-white mb-1">
                    <span className="text-indigo-600">248</span> conversations
                  </div>

                  {/* SVG Line Chart with gradient fill */}
                  <div className="h-20 w-full mt-1">
                    <svg viewBox="0 0 160 70" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Area */}
                      <path
                        d="M 0 55 Q 25 45, 45 40 T 80 15 T 120 40 T 160 25 L 160 70 L 0 70 Z"
                        fill="url(#chartGrad)"
                      />
                      {/* Line */}
                      <path
                        d="M 0 55 Q 25 45, 45 40 T 80 15 T 120 40 T 160 25"
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Highlight Dot */}
                      <circle cx="80" cy="15" r="4" fill="#6366F1" />
                      <circle cx="80" cy="15" r="7" fill="#6366F1" fillOpacity="0.2" />
                    </svg>
                  </div>
                </div>

                <div className="flex justify-between text-[8px] text-slate-400 font-medium px-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span className="font-bold text-indigo-600">Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Overlay AI Chat Widget (Right Side matching the screenshot) */}
        <div className="absolute -right-2 sm:right-3 bottom-2 w-[270px] sm:w-[290px] bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-white/10 overflow-hidden z-20">
          {/* Widget Top Bar: Dark Navy */}
          <div className="h-10 bg-[#0F172A] dark:bg-[#1a1a2e] px-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] font-bold">
                S
              </div>
              <span className="text-xs font-bold">Sales Pilot</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <MoreHorizontal className="w-3.5 h-3.5" />
              <Minus className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Widget Chat Body */}
          <div className="p-3 bg-slate-50/60 dark:bg-[#101010] space-y-2 text-[11px]">
            {/* AI Greeting */}
            <div className="flex items-start gap-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                S
              </div>
              <div className="bg-white dark:bg-[#1c1c1c] text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-xs px-3 py-1.5 shadow-2xs border border-slate-100 dark:border-white/5 font-medium max-w-[85%]">
                Hi! 👋 <br />
                How can I help you today?
              </div>
            </div>

            {/* Customer Question */}
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-xs px-3 py-1.5 font-medium max-w-[85%] shadow-xs">
                Do you have this in a size M?
              </div>
            </div>

            {/* AI Answer with Product Card */}
            <div className="flex items-start gap-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                S
              </div>
              <div className="space-y-1.5 max-w-[90%]">
                <div className="bg-white dark:bg-[#1c1c1c] text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-xs px-3 py-1.5 shadow-2xs border border-slate-100 dark:border-white/5 font-medium">
                  Yes! It's in stock and ready to ship. Here's the product:
                </div>

                {/* Product Card */}
                <div className="bg-white dark:bg-[#181818] rounded-xl border border-slate-200/90 dark:border-white/10 p-2 shadow-xs">
                  <div className="flex items-center gap-2">
                    {/* T-Shirt Graphic Placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-slate-300">
                        <path d="M16 2l4 4-2 3-2-1v14H8V8L6 9 4 6l4-4 4 2 4-2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
                        Classic Tee
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        $29.00
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold shadow-xs transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Widget Input Bar */}
          <div className="p-2 bg-white dark:bg-[#141414] border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-slate-400 text-[10px]">
            <span className="text-slate-400 pl-1">Type a message...</span>
            <div className="flex items-center gap-1.5 pr-1">
              <Paperclip className="w-3 h-3 text-slate-400" />
              <Smile className="w-3 h-3 text-slate-400" />
              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Send className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
