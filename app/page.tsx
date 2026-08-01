import React from 'react';
import { Bot, Shield, Zap, Target, BarChart3, Code, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-100 sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Sales Pilot</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#how-it-works" className="hover:text-indigo-600 transition">How It Works</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Pricing</a>
            <a href="#faq" className="hover:text-indigo-600 transition">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <a href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">Login</a>
            <a href="/signup" className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm shadow-indigo-100">Start Free Trial</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 mb-6">
          <Bot size={14} /> Meet your digital growth workforce
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Your AI Sales & <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Customer Support</span> Employee
        </h1>
        <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-normal leading-relaxed">
          Train an AI on your business in minutes. Answer customer questions, capture leads, recommend products, and support customers 24/7.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="/signup" className="w-full sm:w-auto text-base font-semibold bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group">
            Start Free 3-Day Trial <ArrowRight size={18} className="group-hover:translate-x-0.5 transition" />
          </a>
          <a href="#demo" className="w-full sm:w-auto text-base font-semibold bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-xl hover:bg-slate-100 transition flex items-center justify-center">
            View Demo
          </a>
        </div>
        <p className="mt-4 text-xs text-slate-400">No credit card required. Cancel anytime.</p>
      </section>
    </div>
  );
}