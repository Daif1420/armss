"use client";
import {useState} from "react";
import Link from "next/link";import {FileSpreadsheet,UploadCloud,X,ChevronDown,Layers,RefreshCcw} from "lucide-react";
import DataTable from "../../components/DataTable";
import {useApi} from "../../components/useApi";
const K=({r}:{r:any[][]})=><div className="grid" style={{margin:"12px 0"}}>{r.map(([l,v])=><div key={l} className="card kpi"><span>{l}</span><b>{v}</b></div>)}</div>;
export default function Import(){
 const [f,setF]=useState<File|null>(null),[pv,setPv]=useState<any>(null),[r,setR]=useState<any>(null),[busy,setB]=useState(false),[err,setErr]=useState(""),[n,setN]=useState(0),[ap,setAp]=useState(false),[drag,setDrag]=useState(false),[sh,setSh]=useState(""),[pr,setPr]=useState<{t:string;p:number;i:boolean}|null>(null);
 const {d}=useApi("imports"+(n?"&n="+n:""));
 function post(fd:FormData,onUp:(p:number)=>void,onUpDone:()=>void):Promise<{ok:boolean;j:any}>{return new Promise((res,rej)=>{const x=new XMLHttpRequest();x.open("POST","/api/import");x.upload.onprogress=e=>{if(e.lengthComputable)onUp(Math.round(e.loaded/e.total*100))};x.upload.onload=onUpDone;x.onload=()=>{let j:any={};try{j=JSON.parse(x.responseText)}catch{}res({ok:x.status>=200&&x.status<300,j})};x.onerror=()=>rej(new Error("net"));x.send(fd)})}
 async function send(file:File,preview:boolean,sheet=sh){setB(true);setErr("");setPr({t:preview?"جارٍ رفع الملف وتحليله…":"جارٍ رفع الملف…",p:0,i:false});const fd=new FormData();fd.append("file",file);if(sheet)fd.append("sheet",sheet);if(preview)fd.append("preview","1");if(ap&&!preview)fd.append("apply","1");
  try{const {ok,j}=await post(fd,p=>setPr({t:preview?"جارٍ رفع الملف وتحليله…":"جارٍ رفع الملف…",p,i:false}),()=>setPr({t:preview?"جارٍ قراءة ملف Excel ومقارنة البيانات بقاعدة البيانات…":"جارٍ حفظ البيانات وتوزيع المشروعات على البوكسات… قد تستغرق العملية دقيقة",p:100,i:true}));
   if(!ok)setErr((j.error||"فشل استيراد البيانات")+(j.details?` — ${j.details}`:""));else if(preview){setPv(j);setSh(j.sheet);setR(null)}else{setR(j);setPv(null);setF(null);setN(n+1)}}catch{setErr("خطأ في الاتصال بالشبكة")}setPr(null);setB(false)}
 return <><h1>استيراد البيانات</h1><p className="sub">ارفع ملف المشروعات. ستظهر مراجعة للبيانات قبل حفظ أي شيء.</p><div className="card up">
  <label className={"drop"+(drag?" over":"")+(f?" has":"")} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);const x=e.dataTransfer.files?.[0];if(x&&!busy&&/\.xlsx?$/i.test(x.name)){setSh("");setF(x);setPv(null);setR(null);send(x,true)}}}>
   <input type="file" accept=".xlsx,.xls" disabled={busy} onChange={e=>{const x=e.target.files?.[0]||null;setSh("");setF(x);setPv(null);setR(null);if(x)send(x,true);e.target.value=""}}/>
   {f?<span className="fchip"><FileSpreadsheet size={26} strokeWidth={1.6}/><span><b>{f.name}</b><small>{(f.size/1024/1024).toFixed(2)} MB — اضغط لاختيار ملف آخر</small></span></span>
   :<span className="dz"><UploadCloud size={34} strokeWidth={1.5}/><b>اسحب ملف Excel وأفلته هنا</b><small>أو اضغط للاختيار من جهازك (‎.xlsx / .xls‎)</small></span>}
  </label>
  {f&&!busy&&<button className="lnk" onClick={()=>{setF(null);setPv(null);setR(null);setSh("");setErr("")}}><X size={14}/> إزالة الملف</button>}
  <div className="opts">
   <div className="fld"><span><Layers size={14}/> الشيت</span><div className="dd"><select disabled={busy||!pv?.sheets?.length} value={sh} onChange={e=>{setSh(e.target.value);f&&send(f,true,e.target.value)}}>{pv?.sheets?.length?pv.sheets.map((x:any)=><option key={x.name} value={x.name}>{x.name} — {x.rows} مشروع ({x.min}–{x.max})</option>):<option value="">اختر ملفًا أولًا</option>}</select><ChevronDown size={16}/></div></div>
   <div className="fld"><span><RefreshCcw size={14}/> طريقة الاستيراد</span><div className="dd"><select disabled={busy} value={ap?"replace":"keep"} onChange={e=>setAp(e.target.value==="replace")}><option value="keep">إضافة الجديد واستكمال البيانات الفارغة فقط</option><option value="replace">استبدال القيم الحالية بقيم الملف</option></select><ChevronDown size={16}/></div></div>
  </div>
  {pr&&<div className="prog" role="progressbar" aria-valuenow={pr.i?undefined:pr.p} aria-label={pr.t}><div className="pt"><span>{pr.t}</span>{!pr.i&&<b>{pr.p}%</b>}</div><div className={"pb"+(pr.i?" ind":"")}><i style={{width:pr.p+"%"}}/></div></div>}{err&&<p className="err">{err}</p>}
  {pv&&<><K r={[["جديد",pv.new],["تم تعديله",pv.changed],["موجود بالفعل",pv.existing],["صفوف مكررة",pv.duplicate_rows],["أخطاء",pv.invalid_rows]]}/>
   {pv.warnings?.length>0&&<div className="msg err">{pv.warnings.map((w:string,i:number)=><p key={i}>⚠ {w}</p>)}</div>}
   {pv.mapping&&<details open><summary>الأعمدة المكتشفة (الشيت “{pv.sheet}”، صف العناوين {pv.header_row})</summary><DataTable cols={[{k:"f",l:"الحقل"},{k:"h",l:"عمود Excel"},{k:"n",l:"صفوف فارغة",num:true}]} rows={Object.keys(pv.mapping).map(f=>({f,h:pv.mapping[f]||"— غير موجود —",n:pv.null_counts?.[f]??0}))}/></details>}
   {pv.will_fill_blanks>0&&<p className="msg">يوجد {pv.will_fill_blanks} مشروعًا حاليًا يحتوي على بيانات فارغة، وسيتم استكمالها تلقائيًا من هذا الملف.</p>}
   {pv.changed_sample.length>0&&<DataTable cols={[{k:"job_id",l:"رقم المشروع الذي تم تعديله",num:true},{k:"fields",l:"الحقول"}]} rows={pv.changed_sample}/>}
   {pv.row_errors.length>0&&<DataTable cols={[{k:"row",l:"الصف",num:true},{k:"error",l:"الخطأ"}]} rows={pv.row_errors}/>}
   <p className="msg" style={{padding:8}}>هذه معاينة فقط ولم يتم حفظ أي بيانات بعد. تظل حالات المشروعات ومواقع البوكسات كما هي، ويتم تمييز التغييرات للمراجعة.</p>
   <button className="pri" disabled={busy||!f||pv.new+pv.changed+pv.existing===0} onClick={()=>f&&confirm(`هل تريد حفظ الشيت “${pv.sheet}” (${pv.source_rows} صف) في قاعدة البيانات؟`)&&send(f,false)}>تأكيد الاستيراد</button></>}
  {r?.ok&&<><p><b>تم حفظ الاستيراد.</b> {r.db_total!=null&&<>تحتوي قاعدة البيانات الآن على <b>{Number(r.db_total).toLocaleString("en-US")}</b> مشروع. <Link href="/projects" style={{color:"var(--p)",fontWeight:600}}>عرض المشروعات ›</Link></>}</p>
   {r.alloc_error&&<p className="err">فشل توزيع البوكسات: {r.alloc_error}</p>}
   {r.allocation?.length===0&&!r.alloc_error&&<p className="msg" style={{padding:0,textAlign:"start"}}>لم يتم توزيع مشروعات على البوكسات: أرقام المشروعات المستوردة أقل من 35150 أو أنها موجودة بالفعل داخل بوكسات.</p>}
   {r.allocation?.length>0&&<p>نتيجة التوزيع: {r.allocation.map((a:any)=>a.code+(a.skipped?` تم تخطيها (${a.skipped})`:`: تم تخصيص ${a.assigned}`)).join(" · ")}</p>}
   <K r={[["جديد",r.result.new],["تم تعديله",r.result.changed],["استكمال القيم الفارغة",r.result.filled_blanks??0],["تم استبدالها",r.result.applied??0],["موجود بالفعل",r.result.unchanged],["صفوف مكررة",r.duplicate_rows],["أخطاء",r.invalid_rows]]}/></>}
 </div><h2>عمليات الاستيراد الأخيرة</h2>{d&&<DataTable cols={[{k:"file_name",l:"الملف"},{k:"total_rows",l:"عدد الصفوف",num:true},{k:"new_rows",l:"جديد",num:true},{k:"changed_rows",l:"تم تعديله",num:true},{k:"duplicate_rows",l:"مكرر",num:true},{k:"error_rows",l:"أخطاء",num:true},{k:"created_at",l:"التاريخ"}]} rows={d}/>}</>;
}
