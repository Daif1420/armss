"use client";
import DataTable from "../../components/DataTable";import {useApi} from "../../components/useApi";
export default function Audit(){const {d,e}=useApi("audit");if(e)return <div className="msg err">{e}</div>;if(!d)return <div className="msg">جاري التحميل…</div>;
return <><h1>سجل العمليات</h1><DataTable fk="action" cols={[{k:"created_at",l:"التاريخ"},{k:"action",l:"العملية"},{k:"entity_type",l:"نوع السجل"},{k:"entity_id",l:"المعرّف"},{k:"reason",l:"السبب"}]} rows={d}/></>}
