"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";


export default function SecuritySettings() {

  const supabase = createClient();


  const [password,setPassword] = useState("");

  const [message,setMessage] = useState("");

  const [loading,setLoading] = useState(false);





  async function changePassword(){


    setLoading(true);

    setMessage("");



    const {
      error
    } = await supabase.auth.updateUser({

      password

    });





    if(error){

      setMessage(
        `❌ ${error.message}`
      );

    }
    else{

      setMessage(
        "✅ Password updated successfully"
      );

      setPassword("");

    }



    setLoading(false);

  }







  async function enableMFA(){


    const {
      data,
      error
    } = await supabase.auth.mfa.enroll({

      factorType:"totp"

    });



    if(error){

      setMessage(
        `❌ ${error.message}`
      );

      return;

    }



    console.log(data);



    setMessage(
      "✅ MFA setup started. QR code generated."
    );

  }







return (

<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<h2 className="text-xl font-bold text-slate-900">
Security Settings
</h2>


<p className="mt-1 text-sm text-slate-500">
Manage your account security.
</p>



<div className="mt-6 space-y-6">





{/* Password */}

<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Change Password
</label>


<input

type="password"

value={password}

onChange={(e)=>setPassword(e.target.value)}

placeholder="New password"

className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

/>


<button

onClick={changePassword}

disabled={loading}

className="mt-3 rounded-xl bg-indigo-600 px-5 py-3 text-white"

>

Update Password

</button>


</div>







{/* MFA */}

<div className="rounded-2xl border p-5">


<h3 className="font-semibold text-slate-900">
Two Factor Authentication
</h3>


<p className="mt-1 text-sm text-slate-500">
Protect your account using an authenticator app.
</p>



<button

onClick={enableMFA}

className="mt-4 rounded-xl bg-green-600 px-5 py-3 text-white"

>

Enable 2FA

</button>


</div>







{/* Delete */}

<div className="rounded-2xl border border-red-200 p-5">


<h3 className="font-semibold text-red-700">
Delete Account
</h3>


<p className="mt-1 text-sm text-slate-500">
This action permanently removes your account.
</p>



<button

className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-white"

>

Delete Account

</button>


</div>






{
message && (

<div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">

{message}

</div>

)
}





</div>


</div>

);

}