"use client";
import {useState} from "react";import DataTable from "../../components/DataTable";import {cols} from "../../components/cols";import {useApi} from "../../components/useApi";
const R=["Completed","Missing","Delivered","Pending","In Progress","Ready for Delivery","On Hold"];
export default function Reports(){const {d,e}=useApi("projects"),[r,setR]=useState("");if(e)return <div className="msg err">{e}</div>;if(!d)return <div className="msg">جاري التحميل…</div>;
return <><h1>التقارير</h1><div className="bar noprint"><select value={r} onChange={x=>setR(x.target.value)}><option value="">كل المشروعات</option>{R.map(x=><option key={x} value={x}>{{Completed:"مكتمل",Missing:"مفقود",Delivered:"تم التسليم",Pending:"قيد الانتظار","In Progress":"قيد التنفيذ","Ready for Delivery":"جاهز للتسليم","On Hold":"متوقف"}[x]}</option>)}</select><button onClick={()=>window.print()}>طباعة</button></div>
<DataTable key={r} cols={cols} rows={r?d.filter((x:any)=>x.status===r):d} fk="branch_name"/></>}
