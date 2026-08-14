"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";


interface Props {
  profileId?: string;
}



export default function WidgetCode({
  profileId,
}: Props) {


  const [copied,setCopied] = useState(false);



  const widgetId =
    profileId || "YOUR_PROFILE_ID";



  const code = `<script
  src="https://app.salespilot.ai/widget.js"
  data-profile="${widgetId}"
  defer></script>`;




  async function copyCode(){

    await navigator.clipboard.writeText(code);


    setCopied(true);


    setTimeout(()=>{

      setCopied(false);

    },2000);


  }





  return (

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


      <div className="flex items-center justify-between">


        <div>

          <h2 className="text-xl font-bold text-slate-900">

            Embed Code

          </h2>


          <p className="mt-1 text-sm text-slate-500">

            Copy this snippet and paste it before the closing
            {" "}
            <code className="rounded bg-slate-100 px-1">
              {"</body>"}
            </code>
            {" "}
            tag on your website.

          </p>


        </div>





        <button

          onClick={copyCode}

          className="
          flex
          items-center
          gap-2
          rounded-xl
          bg-gradient-to-r
          from-indigo-600
          to-violet-600
          px-4
          py-2
          font-medium
          text-white
          transition
          hover:opacity-90
          "

        >


          {
            copied ?

            (

              <>

                <Check size={18}/>

                Copied

              </>

            )

            :

            (

              <>

                <Copy size={18}/>

                Copy Code

              </>

            )

          }


        </button>


      </div>





      <div className="mt-6 overflow-x-auto rounded-2xl bg-slate-950 p-5">


        <pre className="text-sm leading-7 text-emerald-400">


          <code>

            {code}

          </code>


        </pre>


      </div>



    </div>

  );

}