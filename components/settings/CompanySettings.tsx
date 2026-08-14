"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function CompanySettings() {

  const supabase = createClient();


  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("E-commerce");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#6366F1");


  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");



  useEffect(() => {

    loadCompany();

  }, []);





  async function loadCompany() {


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

      .eq("id", user.id)

      .maybeSingle();





    if(error){

      console.log(error);

      return;

    }





    if(data){

      setCompanyName(
        data.company_name ?? ""
      );


      setWebsite(
        data.website ?? ""
      );


      setIndustry(
        data.industry ?? "E-commerce"
      );


      setDescription(
        data.company_description ?? ""
      );


      setBrandColor(
        data.brand_color ?? "#6366F1"
      );

    }

  }








  async function saveCompany(){


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

        company_name:companyName,

        website,

        industry,

        company_description:description,

        brand_color:brandColor,

        updated_at:new Date().toISOString()

      });






    if(error){

      setMessage(
        `❌ ${error.message}`
      );

    }
    else{

      setMessage(
        "✅ Company settings saved"
      );

    }




    setLoading(false);

  }







return (

<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<h2 className="text-xl font-bold text-slate-900">
Company Settings
</h2>


<p className="mt-1 text-sm text-slate-500">
Manage your business information used by AI.
</p>




<div className="mt-6 space-y-5">





<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Company Name
</label>


<input

value={companyName}

onChange={(e)=>setCompanyName(e.target.value)}

placeholder="Your company name"

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"

/>

</div>






<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Website
</label>


<input

value={website}

onChange={(e)=>setWebsite(e.target.value)}

placeholder="https://yourstore.com"

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"

/>

</div>






<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Industry
</label>


<select

value={industry}

onChange={(e)=>setIndustry(e.target.value)}

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

>

<option>
E-commerce
</option>

<option>
SaaS
</option>

<option>
Retail
</option>

<option>
Agency
</option>

<option>
Other
</option>


</select>

</div>







<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Company Description
</label>


<textarea

rows={4}

value={description}

onChange={(e)=>setDescription(e.target.value)}

placeholder="Describe your business..."

className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400"

/>


</div>







<div>

<label className="mb-2 block text-sm font-semibold text-slate-700">
Brand Color
</label>


<div className="flex gap-4 items-center">


<input

type="color"

value={brandColor}

onChange={(e)=>setBrandColor(e.target.value)}

className="h-12 w-14 rounded-xl"

/>



<input

value={brandColor}

onChange={(e)=>setBrandColor(e.target.value)}

className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"

/>


</div>


</div>








<button

onClick={saveCompany}

disabled={loading}

className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"

>

{
loading
?
"Saving..."
:
"Save Company Settings"
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