"use client";
import {useRouter} from "next/navigation";import DataTable from "../../components/DataTable";import {useApi} from "../../components/useApi";
const cols=[{k:"dossier",l:"الدوسيه"},{k:"box_code",l:"البوكس"},{k:"range",l:"النطاق"},{k:"projects",l:"المشروعات",num:true},{k:"completed",l:"مكتمل",num:true},{k:"missing",l:"مفقود",num:true},{k:"reserved",l:"محجوز (فارغ)",num:true},{k:"progress",l:"نسبة الإنجاز"},{k:"status",l:"الحالة",st:true}];
export default function Dossiers(){const {d,e}=useApi("dossiers"),r=useRouter();
 if(e)return <div className="msg err">{e}</div>;if(!d)return <div className="msg">جاري التحميل…</div>;
 return <><h1>الدوسيهات</h1><p className="sub">كل دوسيه يحتوي على 50 مشروعًا، وكل بوكس يحتوي على 6 دوسيهات. اضغط على أي دوسيه لعرض مشروعاته.</p>
 <DataTable cols={cols} rows={d} fk="status" onRow={x=>r.push(`/boxes/${x.box_code}/${x.dossier_number}`)}/></>}
