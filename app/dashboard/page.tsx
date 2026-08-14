"use client";

import {
  MessageSquare,
  Database,
  Paintbrush,
  Globe,
} from "lucide-react";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

import MetricCard from "@/components/dashboard/MetricCard";
import AnalyticsChart from "@/components/dashboard/AnalyticsChart";
import PerformanceCard from "@/components/dashboard/PerformanceCard";
import AIStatusCard from "@/components/dashboard/AIStatusCard";
import RecentConversations from "@/components/dashboard/RecentConversations";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import QuickActionCard from "@/components/dashboard/QuickActionCard";


export default function DashboardPage() {

  const supabase = createClient();


  const [stats, setStats] = useState({
    conversations: 0,
    documents: 0,
    pages: 0,
  });



  useEffect(() => {
    loadDashboard();
  }, []);



  async function loadDashboard() {

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();


    if (!user) return;



    const [
      conversationData,
      documentData,
      pageData,
    ] = await Promise.all([


      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),



      supabase
        .from("knowledge_documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),



      supabase
        .from("knowledge_pages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),


    ]);



    setStats({

      conversations:
        conversationData.count ?? 0,


      documents:
        documentData.count ?? 0,


      pages:
        pageData.count ?? 0,

    });


  }





  return (

    <div className="space-y-8">



      {/* Metrics */}

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">


        <MetricCard
          title="Conversations"
          value={stats.conversations}
          trend="+0%"
          description="Total conversations"
          icon={<MessageSquare size={28} />}
          color="from-blue-500 to-cyan-500"
        />



        <MetricCard
          title="Knowledge Files"
          value={stats.documents}
          trend="+0%"
          description="Uploaded documents"
          icon={<Database size={28} />}
          color="from-violet-500 to-fuchsia-500"
        />



        <MetricCard
          title="Widget Installs"
          value={0}
          trend="0%"
          description="Active websites"
          icon={<Paintbrush size={28} />}
          color="from-emerald-500 to-green-500"
        />



        <MetricCard
          title="Website Pages"
          value={stats.pages}
          trend="+0%"
          description="Indexed pages"
          icon={<Globe size={28} />}
          color="from-orange-500 to-amber-500"
        />


      </section>






      {/* Analytics + Performance */}

      <section className="grid gap-6 xl:grid-cols-3">


        <div className="xl:col-span-2">

          <AnalyticsChart />

        </div>


        <PerformanceCard />


      </section>







      {/* AI Status + Conversations */}

      <section className="grid gap-6 xl:grid-cols-3">


        <AIStatusCard />


        <div className="xl:col-span-2">

          <RecentConversations />

        </div>


      </section>







      {/* Activity + Quick Actions */}

      <section className="grid gap-6 xl:grid-cols-3">


        <div className="xl:col-span-2">

          <ActivityFeed />

        </div>





        <div className="space-y-6">


          <h2 className="text-xl font-bold text-slate-900">
            Quick Actions
          </h2>





          <QuickActionCard

            title="Knowledge Base"

            description="Upload PDFs, sync your website and train your AI."

            href="/dashboard/knowledge"

            icon={Database}

          />






          <QuickActionCard

            title="Widget Studio"

            description="Customize your chat widget and copy the embed code."

            href="/dashboard/widget"

            icon={Paintbrush}

          />






          <QuickActionCard

            title="Conversations"

            description="Review customer conversations and AI replies."

            href="/dashboard/conversations"

            icon={MessageSquare}

          />



        </div>


      </section>



    </div>

  );

}