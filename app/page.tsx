"use client";
import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import {Search,FileUp,FileUp as Upload,Tags,FileText,Package as BoxesIcon,CheckCircle2,FolderKanban,Files,Layers} from "lucide-react";
import {useApi,Status} from "../components/useApi";
import ProjectModal from "../components/ProjectModal";

const DONE=["Archived"];
const ORDER:[string,string][]=[["Archived","var(--ok)"],["Pending","var(--mute)"],["Missing","var(--bad)"]];
const labelStatus=(s:string)=>({Archived:"مؤرشف",Missing:"مفقود",Pending:"قيد الانتظار"} as any)[s]||s;
const fmt=(n:number)=>Number(n||0).toLocaleString("en-US");
const sum=(a:any[],k:string)=>a.reduce((t,x)=>t+(Number(x[k])||0),0);
const ago=(iso:string)=>{const s=(Date.now()-new Date(iso).getTime())/1000;if(!(s>=0))return "";if(s<60)return "just now";if(s<3600)return Math.floor(s/60)+" min ago";if(s<86400)return Math.floor(s/3600)+" h ago";return Math.floor(s/86400)+" d ago"};
const BOX_TONE:any={Inprogress:"var(--warn)",Archived:"var(--ok)"};

function Finder({rows,onPick}:{rows:any[];onPick:(p:any)=>void}){
 const [q,setQ]=useState(""),[i,setI]=useState(0),ref=useRef<HTMLInputElement>(null);
 useEffect(()=>{const k=(e:KeyboardEvent)=>{if(e.key==="/"&&!(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)){e.preventDefault();ref.current?.focus()}};window.addEventListener("keydown",k);return()=>window.removeEventListener("keydown",k)},[]);
 const hits=useMemo(()=>{const s=q.trim().toLowerCase();if(!s)return [];
  const idm=rows.filter(r=>String(r.job_id).startsWith(s));const rest=rows.filter(r=>!String(r.job_id).startsWith(s)&&(String(r.job_id).includes(s)||(r.job_name||"").toLowerCase().includes(s)||(r.branch_name||"").toLowerCase().includes(s)));
  return [...idm,...rest].slice(0,8)},[q,rows]);
 const pick=(p:any)=>{if(p){onPick(p);setQ("");setI(0)}};
 return <div className="find"><Search size={17}/><input ref={ref} value={q} placeholder="ابحث برقم المشروع أو الاسم أو الفرع" aria-label="البحث عن مشروع" onChange={e=>{setQ(e.target.value);setI(0)}}
  onKeyDown={e=>{if(e.key==="ArrowDown"){e.preventDefault();setI(Math.min(i+1,hits.length-1))}else if(e.key==="ArrowUp"){e.preventDefault();setI(Math.max(i-1,0))}else if(e.key==="Enter")pick(hits[i]);else if(e.key==="Escape")setQ("")}}/>{!q&&<kbd>/</kbd>}
  {q.trim()&&<div className="hits">{hits.length?hits.map((h,n)=><button key={h.job_id} className={"hit"+(n===i?" on":"")} onMouseEnter={()=>setI(n)} onClick={()=>pick(h)}><b>{h.job_id}</b><span>{h.job_name||"بدون اسم"}</span><i>{h.box||"بدون بوكس"}</i><Status s={h.status}/></button>):<div className="msg">لا يوجد مشروع يطابق “{q}”.</div>}</div>}</div>}

function Empty(){const {d}=useApi("diag");return <><h1>الرئيسية</h1><div className="card" style={{marginTop:18,textAlign:"center",padding:40}}><h2 style={{margin:"0 0 6px"}}>لا توجد مشروعات لعرضها</h2>
 {d?<p className="sub">فحص قاعدة البيانات — المشروعات: <b>{d.projects}</b> · بمستندات: <b>{d.projects_with_documents}</b> · البوكسات: <b>{d.boxes}</b> · الدوسيهات: <b>{d.dossiers}</b> · عمليات الاستيراد: <b>{d.imports}</b>.<br/>{d.projects>0?"قاعدة البيانات تحتوي على مشروعات لكن القائمة فارغة — راجع سجلات الخادم.":"لا توجد مشروعات في قاعدة البيانات، لذلك لم يتم حفظ الاستيراد."}</p>:<p className="sub">جاري فحص قاعدة البيانات…</p>}
 <Link href="/import" className="tab on" style={{display:"inline-flex",width:"auto",background:"var(--p)",color:"#fff"}}><Upload size={16}/>استيراد البيانات</Link></div></>}
export default function Dashboard(){
 const {d:p,e}=useApi("projects"),{d:b}=useApi("boxes"),{d:au}=useApi("audit"),{d:im}=useApi("imports");
 const [sel,setSel]=useState<any>(null);
 const m=useMemo(()=>{if(!p)return null;
  const cnt=(s:string)=>p.filter((x:any)=>x.status===s).length;
  const total=p.length,done=p.filter((x:any)=>DONE.includes(x.status)).length;
  const changed=p.filter((x:any)=>x.import_state==="Changed").length,unboxed=p.filter((x:any)=>!x.box).length;
  const readyClose=(b||[]).filter((x:any)=>x.force_closed);
  // branches
  const br=new Map<string,{n:number;d:number}>();for(const x of p){const k=x.branch_name||"No branch",v=br.get(k)||{n:0,d:0};v.n++;if(DONE.includes(x.status))v.d++;br.set(k,v)}
  const branches=Array.from(br,([name,v])=>({name,...v,left:v.n-v.d})).sort((a,c)=>c.left-a.left).slice(0,7);
  // shelf: 6 dossier cells per box (50 job IDs each)
  const cells=new Map<string,{have:number;done:number;missing:number}[]>();
  for(const bx of b||[])cells.set(bx.box_code,Array.from({length:6},()=>({have:0,done:0,missing:0})));
  const first=new Map<string,number>((b||[]).map((x:any)=>[x.box_code,Number(x.first_job_id)]));
  for(const x of p){if(!x.box||!cells.has(x.box))continue;const f=first.get(x.box);if(!Number.isFinite(f))continue;const i=Math.min(5,Math.max(0,Math.floor((x.job_id-(f as number))/50))),c=cells.get(x.box)![i];c.have++;if(DONE.includes(x.status))c.done++;if(x.status==="Missing")c.missing++}
  const shelf=[...(b||[])].sort((a:any,c:any)=>(a.status==="Archived"?1:0)-(c.status==="Archived"?1:0)||String(a.box_code).localeCompare(String(c.box_code),"en",{numeric:true}));
  return {cnt,total,done,changed,unboxed,readyClose,branches,cells,shelf,docs:sum(p,"total_documents"),sheets:sum(p,"total_sheets"),boxes:sum(p,"total_boxes")}},[p,b]);

 if(e)return <div className="msg err" role="alert">{e}</div>;
 if(!p||!m)return <><h1>الرئيسية</h1><div className="skel" style={{marginTop:18}}/><div className="skel" style={{marginTop:14,height:200}}/></>;
 if(!p.length)return <Empty/>;
 if(false)return <><h1>الرئيسية</h1><div className="card" style={{marginTop:18,textAlign:"center",padding:40}}><h2 style={{margin:"0 0 6px"}}>الأرشيف فارغ</h2><p className="sub">استورد ملف المشروعات لمتابعة التقدم والبوكسات والفروع هنا.</p><Link href="/import" className="tab on" style={{display:"inline-flex",width:"auto",background:"var(--p)"}}><Upload size={16}/>استيراد البيانات</Link></div></>;

 const empty=sum(p,"total_documents")===0&&sum(p,"total_sheets")===0;
 const pct=m.total?Math.round(m.done/m.total*100):0;
 const todo=[
  {n:m.changed,t:"قيم مستوردة تم تعديلها",s:"راجع الاختلافات مقارنة بآخر عملية استيراد",h:"/projects?status=Changed",c:"var(--warn)"},
  {n:m.cnt("Missing"),t:"مشروعات مفقودة",s:"تم تحديدها كمفقودة في الأرشيف",h:"/projects?status=Missing",c:"var(--bad)"},
  {n:m.readyClose.length,t:"بوكسات مغلقة إجبارياً",s:m.readyClose.slice(0,4).map((x:any)=>x.box_code).join(", ")+(m.readyClose.length>4?"…":""),h:"/boxes",c:"var(--ok)"},
  {n:m.unboxed,t:"مشروعات غير مخصصة لبوكس",s:"قم بتوزيعها من صفحة البوكسات",h:"/boxes",c:"var(--p)"},
 ].filter(x=>x.n>0);
 const last=im?.[0];

 const R=54,C=2*Math.PI*R;
 return <>
  <div className="dh"><div><h1>الرئيسية</h1><p className="sub" style={{margin:0}}>{fmt(m.total)} مشروع في {fmt((b||[]).length)} بوكس</p></div><Finder rows={p} onPick={setSel}/></div>
  {empty&&<div className="msg err" role="alert">تم تحميل المشروعات، لكن أعداد المستندات والأوراق فارغة. افتح استيراد البيانات وارفع الملف مرة أخرى لاستكمال القيم الفارغة ومراجعة الأعمدة قبل التأكيد.</div>}

  <div className="kpis">
   <Link href="/projects" className="k" style={{["--c" as any]:"var(--p)"}}><span><i><FolderKanban size={14} strokeWidth={2}/></i>المشروعات</span><b>{fmt(m.total)}</b><em>داخل النظام</em></Link>
   <div className="k" style={{["--c" as any]:"var(--ok)"}}><span><i><CheckCircle2 size={14} strokeWidth={2}/></i>مكتمل</span><b>{fmt(m.done)}</b><em>{pct}% من إجمالي المشروعات</em></div>
   <div className="k" style={{["--c" as any]:"var(--warn)"}}><span><i><Files size={14} strokeWidth={2}/></i>المستندات</span><b>{fmt(m.docs)}</b><em>الإجمالي في الملفات المصدر</em></div>
   <div className="k" style={{["--c" as any]:"var(--ind)"}}><span><i><Layers size={14} strokeWidth={2}/></i>الأوراق</span><b>{fmt(m.sheets)}</b><em>الإجمالي في الملفات المصدر</em></div>
  </div>

  <div className="card" style={{marginTop:14}}><div className="ch"><h2>نسبة الإنجاز</h2><Link href="/projects">كل المشروعات ›</Link></div>
   <div className="hero"><div className="ring"><svg viewBox="0 0 132 132" role="img" aria-label={pct+"% done"}><circle className="bg" cx="66" cy="66" r={R}/><circle className="fg" cx="66" cy="66" r={R} strokeDasharray={`${C*pct/100} ${C}`}/></svg><div className="pct"><span>{pct}<small>%</small></span></div></div>
   <div><div className="cap"><b>{fmt(m.done)} من {fmt(m.total)} مشروع مكتمل</b>مكتمل أو جاهز للتسليم أو تم تسليمه</div>
   <div className="stack" role="img" aria-label="المشروعات حسب الحالة">{ORDER.map(([s,c])=>{const n=m.cnt(s);return n?<Link key={s} href={"/projects?status="+encodeURIComponent(s)} title={`${s}: ${fmt(n)}`} style={{["--c" as any]:c,width:n/m.total*100+"%"}}/>:null})}</div>
   <div className="legend">{ORDER.map(([s,c])=><Link key={s} href={"/projects?status="+encodeURIComponent(s)} style={{["--c" as any]:c}}><i/>{labelStatus(s)} <b>{fmt(m.cnt(s))}</b></Link>)}</div></div></div></div>

  <div className="row2">
   <div className="card"><div className="ch"><h2>تحتاج إلى متابعة</h2></div>
    {todo.length?<ul className="todo">{todo.map(x=><li key={x.t}><Link href={x.h}><span className="n" style={{["--c" as any]:x.c}}>{fmt(x.n)}</span><span><b>{x.t}</b><em>{x.s}</em></span></Link></li>)}</ul>:<div className="ok-all"><CheckCircle2 size={20}/>لا توجد عناصر تحتاج إلى متابعة حاليًا.</div>}</div>
   <div className="card"><div className="ch"><h2>آخر استيراد</h2><Link href="/import">استيراد ›</Link></div>
    {last?<><div style={{fontWeight:600,fontSize:16,unicodeBidi:"plaintext"}}>{last.file_name}</div><div className="sub" style={{margin:"2px 0 0"}}>{ago(last.created_at)} · {fmt(last.total_rows)} rows</div>
     <div className="legend" style={{marginTop:14}}><span>جديد <b>{fmt(last.new_rows)}</b></span><span>تم تعديلها <b>{fmt(last.changed_rows)}</b></span><span>مكررة <b>{fmt(last.duplicate_rows)}</b></span><span>أخطاء <b>{fmt(last.error_rows)}</b></span></div></>:<p className="sub" style={{margin:0}}>لا توجد عمليات استيراد حتى الآن.</p>}
    <div className="acts"><Link href="/import"><FileUp size={18} strokeWidth={1.75}/>استيراد البيانات</Link><Link href="/labels"><Tags size={18} strokeWidth={1.75}/>طباعة الملصقات</Link><Link href="/reports"><FileText size={18} strokeWidth={1.75}/>التقارير</Link><Link href="/boxes"><BoxesIcon size={18} strokeWidth={1.75}/>كل البوكسات</Link></div></div>
  </div>

  <h2>البوكسات</h2>
  <div className="key"><span><i style={{background:"var(--ok)"}}/>مكتمل</span><span><i style={{background:"color-mix(in srgb,var(--p) 35%,transparent)"}}/>داخل النظام ولم تكتمل</span><span><i style={{background:"var(--fill)"}}/>خانة محجوزة</span><span><i style={{boxShadow:"inset 0 0 0 2px var(--bad)"}}/>تحتوي على مشروعات مفقودة</span><span>كل بوكس يحتوي على ٦ دوسيهات</span></div>
  {m.shelf.length?<div className="shelf">{m.shelf.slice(0,24).map((x:any)=>{const cs=m.cells.get(x.box_code)||[];
   return <Link key={x.id} href={"/boxes/"+x.box_code} className="bx">
    <div className="t"><b>{x.box_code}</b><Status s={x.status}/></div>
    <div className="cells">{cs.map((c,i)=><div key={i} className="cell" title={`Dossier ${i+1}: ${c.done} done, ${c.have} in system, ${50-c.have} reserved`}><i style={{height:c.have*2+"%"}}/><u style={{height:c.done*2+"%"}}/>{c.missing>0&&<s/>}</div>)}</div>
    <div className="f"><span>{fmt(x.completed)} / {fmt(x.projects)} مكتمل</span><span>{x.progress}</span></div></Link>})}</div>:<div className="card msg">لا توجد بوكسات حتى الآن. وزّع المشروعات من صفحة البوكسات.</div>}
  {m.shelf.length>24&&<p className="sub" style={{marginTop:14}}><Link href="/boxes" style={{color:"var(--p)",fontWeight:600}}>عرض كل البوكسات ({m.shelf.length}) ›</Link></p>}

  <div className="row2" style={{marginTop:28}}>
   <div className="card"><div className="ch"><h2>الفروع الأكثر مشروعات متبقية</h2></div>
    {m.branches.map(x=><div className="br" key={x.name}><span title={x.name}>{x.name}</span><div className="meter"><i style={{width:(x.n?x.d/x.n*100:0)+"%"}}/></div><small>{fmt(x.left)} متبقي من {fmt(x.n)}</small></div>)}</div>
   <div className="card"><div className="ch"><h2>آخر العمليات</h2><Link href="/audit">سجل العمليات ›</Link></div>
    {au?(au.length?<ul className="feed">{au.slice(0,8).map((a:any)=><li key={a.id}><span>{a.action}{a.entity_id&&a.entity_type!=="import_batch"&&a.entity_type!=="allocation"?<> · <b>{a.entity_id}</b></>:null}</span><time>{ago(a.created_at)}</time></li>)}</ul>:<p className="sub" style={{margin:0}}>لا توجد عمليات حتى الآن.</p>):<div className="skel" style={{height:80}}/>}</div>
  </div>
  {sel&&<ProjectModal p={sel} onClose={()=>setSel(null)}/>}
 </>}
