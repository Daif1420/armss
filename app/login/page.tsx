"use client";
import {useState} from "react";
export default function Login(){const [email,setE]=useState(""),[pw,setP]=useState(""),[err,setErr]=useState(""),[busy,setB]=useState(false);
async function go(e:React.FormEvent){e.preventDefault();setB(true);setErr("");
 try{const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:email,password:pw})});const j=await r.json().catch(()=>({}));
 if(r.ok){location.href="/";return}setErr(j.error||"تعذر تسجيل الدخول")}catch{setErr("تعذر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.")}setB(false)}
return <div className="lg"><div className="lgc"><div className="logoblk"><img src="/intercom-logo-white.png" alt="Intercom" style={{height:30,display:"block"}}/></div>
<h1>تسجيل الدخول إلى نظام الأرشيف</h1><p className="sub">تابع كل بوكس ودوسيه ومشروع داخل الأرشيف.</p>
<form onSubmit={go}><input type="text" placeholder="اسم المستخدم" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={email} onChange={e=>setE(e.target.value)} required/>
<input type="password" placeholder="كلمة المرور" autoComplete="current-password" value={pw} onChange={e=>setP(e.target.value)} required/>
{err&&<div className="err" role="alert" style={{fontSize:14}}>{err}</div>}<button className="pri" disabled={busy}>{busy?"جارٍ تسجيل الدخول…":"دخول"}</button></form></div></div>}
