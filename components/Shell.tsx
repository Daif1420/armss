"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Library,BarChart3,Package,FolderKanban,Folders,History,LayoutGrid,LogOut,Tags,FileUp,ShieldCheck,Moon,Sun} from "lucide-react";
const tabs=[
 ["/","الرئيسية",LayoutGrid,"A"],
 ["/boxes","البوكسات",Package,"A"],
 ["/dossiers","الدوسيهات",Folders,"A"],
 ["/projects","المشروعات",FolderKanban,"A"],
 ["/reports","التقارير",BarChart3,"S"],
 ["/import","استيراد البيانات",FileUp,"M"],
 ["/labels","الملصقات",Tags,"S"],
 ["/audit","سجل العمليات",History,"M"],
 ["/users","المستخدمون",ShieldCheck,"M"]
] as const;
export default function Shell(){
 const p=usePathname(),login=p==="/login",[me,setMe]=useState<{role?:string;email?:string}>({}),[dark,setDark]=useState(false);
 useEffect(()=>{if(!login)fetch("/api/auth/me").then(r=>r.json()).then(j=>setMe(j)).catch(()=>{});const saved=localStorage.getItem("arms-theme");const d=saved?saved==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;setDark(d);document.documentElement.classList.toggle("dark",d);document.documentElement.classList.toggle("light",!d)},[login]);
 if(login)return null;
 const role=me.role||"";
 const show=(t:string)=>t==="A"||(t==="S"&&["System Manager","System Admin","Archive Manager","Data Entry","Supervisor"].includes(role))||(t==="M"&&["System Manager","System Admin"].includes(role));
 const on=(h:string)=>h==="/"?p==="/":p===h||p.startsWith(h+"/");
 return <header className="v2-topbar"><div className="v2-topbar-inner">
  <Link href="/" className="v2-brand" aria-label="الرئيسية"><span className="v2-brand-icon"><Library size={18} strokeWidth={1.9}/></span><span className="v2-brand-copy"><b>Intercom</b><small>نظام إدارة الأرشيف</small></span></Link>
  <nav className="v2-nav" aria-label="التنقل الرئيسي">{tabs.filter(t=>show(t[3])).map(([h,l,I])=><Link key={h} href={h} className={"v2-nav-item"+(on(h)?" active":"")}><I size={15} strokeWidth={1.9}/><span>{l}</span></Link>)}</nav>
  <div className="v2-top-actions"><button className="v2-theme" title={dark?"الوضع الفاتح":"الوضع الداكن"} onClick={()=>{const next=!dark;setDark(next);document.documentElement.classList.toggle("dark",next);document.documentElement.classList.toggle("light",!next);localStorage.setItem("arms-theme",next?"dark":"light")}}>{dark?<Sun size={16}/>:<Moon size={16}/>}</button><span className="v2-user"><b>{(me.email||"").replace(/@arms\.local$/i,"")||"مستخدم النظام"}</b>{role&&<small>{({"System Manager":"مدير النظام","System Admin":"مدير النظام","Archive Manager":"مدير الأرشيف","Data Entry":"مدخل بيانات",Supervisor:"مشرف",Viewer:"مشاهد"} as any)[role]||"موظف"}</small>}</span><button className="v2-logout" title="تسجيل الخروج" onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});location.href="/login"}}><LogOut size={16}/><span>خروج</span></button></div>
 </div></header>
}
