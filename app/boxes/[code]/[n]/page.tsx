"use client";
import {useState} from "react";import Link from "next/link";import {useParams} from "next/navigation";
import DataTable from "../../../../components/DataTable";import ProjectModal from "../../../../components/ProjectModal";import {useApi,Status} from "../../../../components/useApi";import {cols} from "../../../../components/cols";
const DONE=["Completed","Ready for Delivery","Delivered"];
export default function DossierPage(){const {code,n}=useParams() as {code:string;n:string};const {d,e}=useApi("box&code="+code),[sel,setSel]=useState<any>(null);
 if(e)return <div className="msg err">{e}</div>;if(!d)return <div className="msg">جاري التحميل…</div>;
 const ds=d.dossiers.find((x:any)=>String(x.dossier_number)===n);
 if(!ds)return <><h1>الدوسيه غير موجود</h1><p className="sub">البوكس {code} لا يحتوي على الدوسيه {n}. <Link href={"/boxes/"+code} style={{color:"var(--p)"}}>العودة إلى البوكس ›</Link></p></>;
 const mine=d.projects.filter((p:any)=>p.dossier_id===ds.id),have=new Set(mine.map((p:any)=>p.job_id)),slots:any[]=[];
 for(let i=ds.first_job_id;i<=ds.last_job_id;i++)if(!have.has(i))slots.push({job_id:i,job_name:"خانة محجوزة — غير موجودة في النظام",status:"Reserved",reserved:true});
 const rows=[...mine,...slots].sort((a:any,b:any)=>a.job_id-b.job_id);
 const done=mine.filter((p:any)=>DONE.includes(p.status)).length,miss=mine.filter((p:any)=>p.status==="Missing").length,total=ds.last_job_id-ds.first_job_id+1,pct=mine.length?Math.round(done/mine.length*100):0;
 const num=(v:string)=>Number(v)||0;const prev=num(n)>1?num(n)-1:null,next=d.dossiers.some((x:any)=>x.dossier_number===num(n)+1)?num(n)+1:null;
 return <><p className="sub" style={{margin:"0 0 6px"}}><Link href="/boxes" style={{color:"var(--p)"}}>البوكسات</Link> › <Link href={"/boxes/"+code} style={{color:"var(--p)"}}>{code}</Link></p>
 <h1>دوسيه {n} <Status s={d.box.status}/></h1><p className="sub">بوكس {code} · أرقام المشروعات {ds.first_job_id} – {ds.last_job_id}</p>
 <div className="kpis">
  <div className="k" style={{["--c" as any]:"var(--p)"}}><span>داخل النظام</span><b>{mine.length}</b><em>من إجمالي {total} خانة</em></div>
  <div className="k" style={{["--c" as any]:"var(--ok)"}}><span>مكتمل</span><b>{done}</b><em>{pct}% من المشروعات</em></div>
  <div className="k" style={{["--c" as any]:"var(--bad)"}}><span>مفقود</span><b>{miss}</b><em>تم تحديدها كمفقودة</em></div>
  <div className="k" style={{["--c" as any]:"var(--mute)"}}><span>محجوز</span><b>{slots.length}</b><em>خانات فارغة</em></div></div>
 <div className="bar" style={{margin:"16px 0"}}>{prev&&<Link href={`/boxes/${code}/${prev}`}><button>‹ الدوسيه {prev}</button></Link>}{next&&<Link href={`/boxes/${code}/${next}`}><button>الدوسيه {next} ›</button></Link>}<Link href={"/boxes/"+code} style={{marginInlineStart:"auto"}}><button>العودة إلى البوكس</button></Link></div>
 <DataTable cols={cols} rows={rows} fk="status" onRow={(p:any)=>!p.reserved&&setSel(p)}/>{sel&&<ProjectModal p={sel} onClose={()=>setSel(null)}/>}</>}
