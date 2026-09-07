"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  Database,
  Paintbrush,
  Globe,
  Calendar,
  ChevronDown,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

import MetricCard from "@/components/dashboard/MetricCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import PerformanceCard from "@/components/dashboard/PerformanceCard";
import RecentConversations from "@/components/dashboard/RecentConversations";
import AIStatusCard from "@/components/dashboard/AIStatusCard";

export default function DashboardPage() {
  const supabase = createClient();

  const [userName, setUserName] = useState("there");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    conversations: 0,
    documents: 0,
    widgets: 0,
    pages: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Fetch user profile for display name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.full_name) {
        setUserName(profile.full_name);
      } else if (user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      } else if (user.email) {
        setUserName(user.email.split("@")[0]);
      }

      // 2. Fetch real counts in parallel
      const [conversationData, documentData, widgetData, pageData] =
        await Promise.all([
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .or(`profile_id.eq.${user.id},user_id.eq.${user.id}`),

          supabase
            .from("knowledge_documents")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),

          supabase
            .from("widget_settings")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),

          supabase
            .from("knowledge_pages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ]);

      setStats({
        conversations: conversationData.count ?? 0,
        documents: documentData.count ?? 0,
        widgets: widgetData.count ?? 0,
        pages: pageData.count ?? 0,
      });
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* ========================================================================= */}
      {/* DASHBOARD HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {userName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Here&apos;s what&apos;s happening with your AI employee today.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#12151d] px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 shadow-2xs self-start sm:self-auto">
          <Calendar size={15} className="text-slate-400 dark:text-slate-500" />
          <span>Last 7 days</span>
          <ChevronDown size={14} className="text-slate-400 dark:text-slate-500 ml-1" />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 METRIC CARDS */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <MetricCard
          title="Conversations"
          value={stats.conversations}
          trend="+0%"
          description="Total conversations"
          icon={<MessageSquare size={20} />}
          iconBgColor="bg-[#5B3DF5]"
          iconTextColor="text-white"
        />

        <MetricCard
          title="Knowledge Files"
          value={stats.documents}
          trend="+0%"
          description="Uploaded documents"
          icon={<Database size={20} />}
          iconBgColor="bg-[#6344F5]"
          iconTextColor="text-white"
        />

        <MetricCard
          title="Widget Installs"
          value={stats.widgets}
          trend="0%"
          description="Active websites"
          icon={<Paintbrush size={20} />}
          iconBgColor="bg-[#05B46E]"
          iconTextColor="text-white"
        />

        <MetricCard
          title="Website Pages"
          value={stats.pages}
          trend="+0%"
          description="Indexed pages"
          icon={<Globe size={20} />}
          iconBgColor="bg-[#F57B00]"
          iconTextColor="text-white"
        />
      </section>

      {/* ========================================================================= */}
      {/* ANALYTICS + AI PERFORMANCE */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <div className="lg:col-span-8">
          <AnalyticsChart />
        </div>

        <div className="lg:col-span-4">
          <PerformanceCard />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RECENT CONVERSATIONS + SALES PILOT AI STATUS */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <div className="lg:col-span-8">
          <RecentConversations />
        </div>

        <div className="lg:col-span-4">
          <AIStatusCard />
        </div>
      </section>
    </div>
  );
}