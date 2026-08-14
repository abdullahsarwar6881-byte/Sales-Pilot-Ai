"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ProfileImageUpload from "@/components/settings/ProfileImageUpload";

export default function ProfilePage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUserId(user.id);
    setEmail(user.email ?? "");

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (data) {
      setFullName(data.full_name ?? "");
      setCompanyName(data.company_name ?? "");
      setAvatarUrl(data.avatar_url ?? "");
    }

    setLoading(false);
  }

  async function saveProfile() {
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        company_name: companyName,
      })
      .eq("id", userId);

    if (error) {
      alert(error.message);
    } else {
    window.dispatchEvent(new Event("profile-updated"));    
      alert("Profile updated successfully.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900">
          Profile
        </h1>

        <p className="mt-2 text-slate-500">
          Manage your personal information.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

        {/* Avatar Upload */}
        <div className="flex items-start gap-8">

          <ProfileImageUpload
            userId={userId}
            avatarUrl={avatarUrl}
            onUpload={setAvatarUrl}
          />

          <div className="flex-1">

            <h2 className="text-2xl font-bold text-slate-900">
              {fullName || "User"}
            </h2>

            <p className="mt-1 text-slate-500">
              {email}
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Upload a profile picture to personalize your Sales Pilot account.
            </p>

          </div>

        </div>

        {/* Form */}
        <div className="mt-10 grid gap-6">

          <div>

            <label className="mb-2 block font-medium text-slate-700">
              Full Name
            </label>

            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />

          </div>

          <div>

            <label className="mb-2 block font-medium text-slate-700">
              Email
            </label>

            <input
              value={email}
              disabled
              className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block font-medium text-slate-700">
              Company Name
            </label>

            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
            />

          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>

        </div>

      </div>
    </div>
  );
}