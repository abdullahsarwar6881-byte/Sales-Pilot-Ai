"use client";


interface Props {

  aiName:string;
  setAiName:(value:string)=>void;


  welcomeMessage:string;
  setWelcomeMessage:(value:string)=>void;


  brandColor:string;
  setBrandColor:(value:string)=>void;


  language?:string;
  setLanguage?:(value:string)=>void;


  placeholder?:string;
  setPlaceholder?:(value:string)=>void;

}



export default function WidgetSettings({

  aiName,

  setAiName,

  welcomeMessage,

  setWelcomeMessage,

  brandColor,

  setBrandColor,

  language="English",

  setLanguage,

  placeholder="Ask me anything...",

  setPlaceholder,


}:Props){



return (


<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">


<h2 className="text-xl font-bold text-slate-900">

Widget Settings

</h2>


<p className="mt-1 text-sm font-medium text-slate-500">

Customize how your AI assistant looks and behaves.

</p>






<div className="mt-8 space-y-6">





{/* AI Name */}

<div>

<label className="mb-2 block text-sm font-medium text-slate-700">

AI Name

</label>


<input

value={aiName}

onChange={(e)=>setAiName(e.target.value)}

placeholder="Sales Pilot AI"

className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"

/>


</div>








{/* Welcome Message */}


<div>


<label className="mb-2 block text-sm font-medium text-slate-700">

Welcome Message

</label>



<textarea


rows={4}


value={welcomeMessage}


onChange={(e)=>

setWelcomeMessage(e.target.value)

}


placeholder="Hi 👋 How can I help you today?"


className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"


/>


</div>








{/* Brand Color */}


<div>


<label className="mb-2 block text-sm font-medium text-slate-700">

Brand Color

</label>



<div className="flex items-center gap-4">



<input

type="color"

value={brandColor}

onChange={(e)=>

setBrandColor(e.target.value)

}

className="h-14 w-14 cursor-pointer rounded-xl border border-slate-200"

/>





<input

value={brandColor}

onChange={(e)=>

setBrandColor(e.target.value)

}

className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"

/>



</div>


</div>









{/* Language */}


<div>


<label className="mb-2 block text-sm font-medium text-slate-700">

Language

</label>




<select


value={language}


onChange={(e)=>

setLanguage?.(e.target.value)

}


className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"


>


<option>English</option>

<option>Spanish</option>

<option>French</option>

<option>German</option>


</select>


</div>









{/* Input Placeholder */}


<div>


<label className="mb-2 block text-sm font-medium text-slate-700">

Input Placeholder

</label>




<input


value={placeholder}


onChange={(e)=>

setPlaceholder?.(e.target.value)

}


className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500"


/>



</div>







</div>



</div>


);


}