import {createHmac} from "crypto";import {createClient} from "@supabase/supabase-js";
export type Sess={email:string;role:string;uid?:string};
export function session(req:Request):Sess|null{const c=(req.headers.get("cookie")||"").split(/;\s*/).find(x=>x.startsWith("arms_session="));const sec=process.env.SESSION_SECRET;if(!c||!sec)return null;
 const [p,sig]=c.slice(13).split(".");if(!p||sig!==createHmac("sha256",sec).update(p).digest("base64url"))return null;
 try{const d=JSON.parse(Buffer.from(p,"base64url").toString());return d.exp>Date.now()?d:null}catch{return null}}
export const db=()=>createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
export const DONE=["Archived"];
export const ADMIN=["System Manager","System Admin"];
export const ARCHIVE_ADMIN=[...ADMIN,"Archive Manager"];
export const MANAGER=[...ARCHIVE_ADMIN,"Supervisor"];
export const EDITOR=[...MANAGER,"Data Entry"];
export const ROLES=["System Manager","System Admin","Archive Manager","Data Entry","Supervisor","Viewer","User"];
export const ROLE_AR:Record<string,string>={"System Manager":"مدير النظام","System Admin":"مدير النظام","Archive Manager":"مدير الأرشيف","Data Entry":"مدخل بيانات",Supervisor:"مشرف",Viewer:"مشاهد",User:"موظف"};
// Recompute project / dossier / box statuses with the DB function from migration 003 (no-op if it is not installed yet).
export async function recalcBoxes(s:any,ids?:string[]){
 let list=ids;
 if(!list){const {data}=await s.from("archive_boxes").select("id,first_job_id,last_job_id");list=(data||[]).filter((b:any)=>b.first_job_id!=null&&b.last_job_id===Number(b.first_job_id)+299).map((b:any)=>b.id)}
 for(const id of list!){const r=await s.rpc("arms_recalculate_box",{p_box_id:id});if(r.error)return r.error.message}
 return "";
}
