"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Upload, Trash2 } from "lucide-react";

export default function ProfileSettings() {

  const supabase = createClient();


  const [userId, setUserId] = useState("");

  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [avatar, setAvatar] = useState("");

  const [newAvatar, setNewAvatar] = useState<File | null>(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");





  useEffect(() => {

    loadProfile();

  }, []);





  async function loadProfile() {


    const {
      data:{
        user
      }
    } = await supabase.auth.getUser();



    if(!user) return;



    setUserId(user.id);

    setEmail(user.email ?? "");





    const {
      data,
      error
    } = await supabase

      .from("profiles")

      .select("*")

      .eq("id",user.id)

      .maybeSingle();





    if(error){

      console.log(error);

      return;

    }





    if(data){

      setName(
        data.full_name ?? ""
      );


      setAvatar(
        data.avatar_url ?? ""
      );

    }

  }








  function handleAvatarChange(
    e: React.ChangeEvent<HTMLInputElement>
  ){


    const file = e.target.files?.[0];


    if(!file) return;



    setNewAvatar(file);


    const url = URL.createObjectURL(file);


    setPreview(url);


  }








  async function uploadAvatar(){


    if(!newAvatar) return avatar;



    setUploading(true);



    const fileName =
      `${userId}/${Date.now()}-${newAvatar.name}`;





    const {
      error
    } = await supabase.storage

      .from("avatars")

      .upload(

        fileName,

        newAvatar,

        {
          upsert:true
        }

      );





    if(error){

      console.log(error);

      setMessage(
        "❌ Avatar upload failed"
      );


      setUploading(false);


      return avatar;

    }







    const {
      data
    } = supabase.storage

      .from("avatars")

      .getPublicUrl(fileName);






    setUploading(false);



    return data.publicUrl;


  }








  async function saveProfile(){


    setLoading(true);

    setMessage("");



    let avatarUrl = avatar;



    if(newAvatar){

      avatarUrl = await uploadAvatar();

    }





    const {
      error
    } = await supabase

      .from("profiles")

      .upsert({

        id:userId,

        full_name:name,

        avatar_url:avatarUrl,

        updated_at:new Date().toISOString()

      });





    if(error){

      console.log(error);


      setMessage(
        `❌ ${error.message}`
      );


    }

    else{


      setAvatar(
        avatarUrl
      );


      setPreview("");

      setNewAvatar(null);


      setMessage(
        "✅ Profile updated successfully"
      );

    }





    setLoading(false);

  }








  function removeAvatar(){

    setAvatar("");

    setPreview("");

    setNewAvatar(null);

  }







return (

<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<div className="flex items-center gap-3">


<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">

<User size={24}/>

</div>



<div>

<h2 className="text-xl font-bold text-slate-900">
Profile Settings
</h2>


<p className="text-sm text-slate-500">
Manage your account information
</p>


</div>


</div>







<div className="mt-8 space-y-6">





{/* Avatar */}


<div>


<label className="mb-2 block text-sm font-semibold text-slate-700">

Profile Picture

</label>



<div className="flex items-center gap-5">



<div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100">


{
preview || avatar ? (

<img

src={preview || avatar}

alt="avatar"

className="h-full w-full object-cover"

/>

)

:

(

<div className="flex h-full w-full items-center justify-center text-slate-400">

<User/>

</div>

)

}



</div>






<div className="space-y-2">


<label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">


<Upload size={16}/>

Upload Image


<input

hidden

type="file"

accept="image/*"

onChange={handleAvatarChange}

/>


</label>





<button

onClick={removeAvatar}

type="button"

className="flex items-center gap-2 text-sm text-red-600"

>


<Trash2 size={15}/>

Remove


</button>


</div>



</div>


</div>







{/* Name */}

<div>


<label className="mb-2 block text-sm font-semibold text-slate-700">

Full Name

</label>



<input

value={name}

onChange={(e)=>setName(e.target.value)}

placeholder="Enter your name"

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"

/>


</div>







{/* Email */}

<div>


<label className="mb-2 block text-sm font-semibold text-slate-700">

Email

</label>



<input

disabled

value={email}

className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700"

/>


</div>







{/* User ID */}

<div>


<label className="mb-2 block text-sm font-semibold text-slate-700">

User ID

</label>


<input

disabled

value={userId}

className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-xs text-slate-600"

/>


</div>







<button

onClick={saveProfile}

disabled={loading || uploading}

className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"

>


{
loading
?
"Saving..."
:
uploading
?
"Uploading..."
:
"Save Profile"

}



</button>








{
message && (

<div className="rounded-xl bg-slate-100 p-3 text-sm font-medium text-slate-700">

{message}

</div>

)
}







</div>


</div>

);


}