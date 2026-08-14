"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";


export default function AISettings() {


  const supabase = createClient();



  const [aiName,setAiName] = useState("Pilot Bot");

  const [welcomeMessage,setWelcomeMessage] = useState(
    "Hello! How can I help you today?"
  );


  const [personality,setPersonality] = useState(
    "Helpful and professional"
  );


  const [tone,setTone] = useState(
    "Friendly"
  );


  const [loading,setLoading] = useState(false);

  const [message,setMessage] = useState("");





  useEffect(()=>{

    loadAISettings();

  },[]);






  async function loadAISettings(){


    const {
      data:{
        user
      }
    } = await supabase.auth.getUser();



    if(!user) return;





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

      setAiName(
        data.ai_name ?? "Pilot Bot"
      );


      setWelcomeMessage(
        data.welcome_message ??
        "Hello! How can I help you today?"
      );


      setPersonality(
        data.ai_personality ??
        "Helpful and professional"
      );


      setTone(
        data.ai_tone ??
        "Friendly"
      );

    }


  }








async function saveAI(){


  setLoading(true);

  setMessage("");



  const {
    data:{
      user
    }
  } = await supabase.auth.getUser();



  if(!user){

    setLoading(false);

    return;

  }






  const {
    error
  } = await supabase

    .from("profiles")

    .upsert({

      id:user.id,

      ai_name:aiName,

      welcome_message:welcomeMessage,

      ai_personality:personality,

      ai_tone:tone,

      updated_at:new Date().toISOString()

    });





  if(error){

    setMessage(
      `❌ ${error.message}`
    );

  }
  else{

    setMessage(
      "✅ AI settings saved"
    );

  }



  setLoading(false);

}








return (

<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<h2 className="text-xl font-bold text-slate-900">
AI Settings
</h2>


<p className="mt-1 text-sm text-slate-500">
Customize how your AI assistant behaves.
</p>





<div className="mt-6 space-y-5">





<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
AI Name
</label>


<input

value={aiName}

onChange={(e)=>setAiName(e.target.value)}

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

/>


</div>






<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Welcome Message
</label>


<textarea

rows={4}

value={welcomeMessage}

onChange={(e)=>setWelcomeMessage(e.target.value)}

className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

/>


</div>







<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Personality
</label>


<select

value={personality}

onChange={(e)=>setPersonality(e.target.value)}

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

>


<option>
Helpful and professional
</option>

<option>
Friendly assistant
</option>

<option>
Sales expert
</option>

<option>
Technical support
</option>


</select>


</div>








<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Tone
</label>


<select

value={tone}

onChange={(e)=>setTone(e.target.value)}

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

>


<option>
Friendly
</option>

<option>
Professional
</option>

<option>
Casual
</option>

<option>
Premium
</option>


</select>


</div>







<button

onClick={saveAI}

disabled={loading}

className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"

>


{
loading
?
"Saving..."
:
"Save AI Settings"
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