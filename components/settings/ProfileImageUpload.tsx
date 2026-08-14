"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  avatarUrl: string;
  onUpload: (url: string) => void;
}

export default function ProfileImageUpload({
  userId,
  avatarUrl,
  onUpload,
}: Props) {
  const supabase = createClient();

  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function uploadAvatar(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("Avatars")
        .upload(fileName, file, {
          upsert: true,
        });

      if (error) {
        alert(error.message);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("Avatars")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
        })
        .eq("id", userId);

      if (updateError) {
        alert(updateError.message);
        setUploading(false);
        return;
      }

      onUpload(publicUrl);
window.dispatchEvent(new Event("profile-updated"));
      alert("Profile picture updated successfully!");
    } catch (error) {
      console.error(error);
      alert("Something went wrong while uploading.");
    }

    setUploading(false);
  }

  async function removeAvatar() {
    if (!confirm("Remove your profile picture?")) {
      return;
    }

    setRemoving(true);

    try {
      if (avatarUrl) {
        const url = new URL(avatarUrl);

        const filePath = decodeURIComponent(
          url.pathname.split("/storage/v1/object/public/Avatars/")[1] ?? ""
        );

        if (filePath) {
          await supabase.storage
            .from("Avatars")
            .remove([filePath]);
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
        })
        .eq("id", userId);

      if (error) {
        alert(error.message);
        setRemoving(false);
        return;
      }

      onUpload("");

      alert("Profile picture removed.");
    } catch (error) {
      console.error(error);
      alert("Failed to remove profile picture.");
    }

    setRemoving(false);
  }

  return (
    <div className="space-y-4">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          className="h-32 w-32 rounded-full border-4 border-indigo-100 object-cover"
        />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-indigo-600 text-5xl font-bold text-white">
          ?
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={uploadAvatar}
        disabled={uploading || removing}
        className="block w-full text-sm text-slate-600
          file:mr-4
          file:rounded-lg
          file:border-0
          file:bg-indigo-600
          file:px-4
          file:py-2
          file:text-white
          file:cursor-pointer
          hover:file:bg-indigo-700"
      />

      {avatarUrl && (
        <button
          onClick={removeAvatar}
          disabled={uploading || removing}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
        >
          {removing ? "Removing..." : "Remove Profile Picture"}
        </button>
      )}

      {uploading && (
        <p className="text-sm text-slate-500">
          Uploading...
        </p>
      )}
    </div>
  );
}