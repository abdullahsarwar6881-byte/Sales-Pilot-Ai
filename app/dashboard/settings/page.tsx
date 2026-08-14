"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

import ProfileSettings from "@/components/settings/ProfileSettings";
import CompanySettings from "@/components/settings/CompanySettings";
import AISettings from "@/components/settings/AISettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import SecuritySettings from "@/components/settings/SecuritySettings";
import BillingSettings from "@/components/settings/BillingSettings";


export default function SettingsPage() {

  const supabase = createClient();


  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");

  const [aiName, setAiName] = useState("Pilot Bot");

  const [brandColor, setBrandColor] = useState("#4F46E5");

  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hello! How can I help you today?"
  );


  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");



  useEffect(() => {
    loadProfile();
  }, []);




  async function loadProfile() {

    const {
      data: { user },
    } = await supabase.auth.getUser();


    if (!user) return;



    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();



    if (error) {
      console.error(error);
      return;
    }



    if (!data) return;



    setCompanyName(data.company_name ?? "");
    setWebsite(data.website ?? "");
    setAiName(data.ai_name ?? "Pilot Bot");
    setBrandColor(data.brand_color ?? "#4F46E5");

    setWelcomeMessage(
      data.welcome_message ??
      "Hello! How can I help you today?"
    );

  }





  async function handleSave() {

    setLoading(true);
    setMessage("");



    const {
      data: { user },
    } = await supabase.auth.getUser();



    if (!user) {

      setMessage("❌ You must be logged in.");

      setLoading(false);

      return;
    }




    const { error } = await supabase
      .from("profiles")
      .upsert({

        id: user.id,

        company_name: companyName,

        website,

        ai_name: aiName,

        brand_color: brandColor,

        welcome_message: welcomeMessage,

        updated_at: new Date().toISOString(),

      });





    if (error) {

      console.error(error);

      setMessage(`❌ ${error.message}`);

    } else {

      setMessage("✅ Settings saved successfully.");

    }



    setLoading(false);

  }






  return (

    <div className="space-y-6">


      {/* Header */}

      <div>

        <h1 className="text-3xl font-bold text-slate-900">
          Settings
        </h1>


        <p className="mt-2 text-slate-500">
          Configure your AI assistant and business information.
        </p>

      </div>





      {/* Settings Components */}

      <ProfileSettings />


      <CompanySettings />


      <AISettings />



      <NotificationSettings />


      <SecuritySettings />


      <BillingSettings />





      {/* Save Database Settings */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


        <h2 className="text-xl font-bold text-slate-900">
          Save AI Configuration
        </h2>


        <p className="mt-1 text-sm text-slate-500">
          Save your AI assistant settings to your account.
        </p>



        <button

          onClick={handleSave}

          disabled={loading}

          className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"

        >

          {loading ? "Saving..." : "Save Changes"}

        </button>




        {message && (

          <div

            className={`mt-4 rounded-xl p-3 text-sm font-medium ${
              
              message.startsWith("✅")

              ? "bg-green-100 text-green-700"

              : "bg-red-100 text-red-700"

            }`}

          >

            {message}

          </div>

        )}



      </div>


    </div>

  );

}