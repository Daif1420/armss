import {NextResponse as R} from "next/server";import {session,db,ARCHIVE_ADMIN,recalcBoxes} from "../../../lib/server";import {allocate} from "../../../lib/alloc";
export const runtime="nodejs";
export async function POST(req:Request){const u=session(req);if(!u)return R.json({error:"Unauthorized"},{status:401});
 if(!ARCHIVE_ADMIN.includes(u.role))return R.json({error:"Only a System Admin or Archive Manager can create boxes."},{status:403});
 const b=await req.json().catch(()=>({}));if(b.auto)return R.json({ok:true,allocation:await allocate(db(),u.uid)});const code=String(b.code||"").toUpperCase(),first=Number(b.first),count=Number(b.count||300);
 if(!/^D\d+$/.test(code)||!Number.isSafeInteger(first)||first<=0||!Number.isInteger(count)||count<1||count>300)return R.json({error:"Invalid box code, first project or count (1–300)."},{status:400});
 const last=first+count-1,s=db();
 const ov=await s.from("archive_boxes").select("box_code").or(`box_code.eq.${code},and(first_job_id.lte.${last},last_job_id.gte.${first})`);
 if(ov.data?.length)return R.json({error:`Overlaps or duplicates existing box: ${ov.data.map(x=>x.box_code).join(", ")}`},{status:409});
 const bx=await s.from("archive_boxes").insert({box_code:code,first_job_id:first,last_job_id:last}).select("id").single();if(bx.error)return R.json({error:bx.error.message},{status:500});
 let assigned=0;
 for(let i=0;i<Math.ceil(count/50);i++){const a=first+i*50,z=Math.min(a+49,last);
  const d=await s.from("dossiers").insert({box_id:bx.data.id,dossier_number:i+1,first_job_id:a,last_job_id:z}).select("id").single();if(d.error)return R.json({error:d.error.message},{status:500});
  const up=await s.from("projects").update({box_id:bx.data.id,dossier_id:d.data.id}).gte("job_id",a).lte("job_id",z).is("box_id",null).select("id");assigned+=up.data?.length||0}
 if(count===300){const r=await s.rpc("arms_create_expected_slots",{p_box_id:bx.data.id});if(r.error)return R.json({error:"Box created but project slots failed: "+r.error.message},{status:500});await recalcBoxes(s,[bx.data.id])}
 await s.from("audit_logs").insert({actor_id:u.uid??null,action:"Box created",entity_type:"box",entity_id:code,after_data:{first,last,count,assigned}});
 return R.json({ok:true,assigned})}
export async function PATCH(req:Request){const u=session(req);if(!u)return R.json({error:"Unauthorized"},{status:401});
 const {code,action,reason}=await req.json().catch(()=>({}));const s=db();
 if(!ARCHIVE_ADMIN.includes(u.role))return R.json({error:"Only a System Admin or Archive Manager can force-close or reopen a box."},{status:403});
 const {data:bx}=await s.from("archive_boxes").select("id,status,first_job_id,last_job_id,force_closed").eq("box_code",code).maybeSingle();if(!bx)return R.json({error:"Box not found."},{status:404});
 const why=String(reason||"").trim(),now=new Date().toISOString();
 // Force Closed is a flag + event. It never changes the Box status (Inprogress / Archived), which is derived from its projects.
 if(action==="reopen"){
  if(!bx.force_closed)return R.json({error:"This box is not force-closed."},{status:409});
  if(!why)return R.json({error:"A reason is required."},{status:400});
  const e=await s.from("archive_boxes").update({force_closed:false,force_closed_at:null,force_closed_by:null,force_close_reason:null,override_reason:null,updated_at:now}).eq("id",bx.id);if(e.error)return R.json({error:e.error.message},{status:500});
  await s.from("audit_logs").insert({actor_id:u.uid??null,action:"Box force-close removed",entity_type:"box",entity_id:code,reason:why,before_data:{force_closed:true},after_data:{force_closed:false}});return R.json({ok:true})}
 if(action!=="close")return R.json({error:"Unknown action."},{status:400});
 if(bx.force_closed)return R.json({error:"This box is already force-closed."},{status:409});
 const {data:ps}=await s.from("projects").select("status,import_state").eq("box_id",bx.id);const m=ps||[];const total=bx.first_job_id&&bx.last_job_id?bx.last_job_id-bx.first_job_id+1:m.length;
 const cnt=(st:string)=>m.filter(x=>x.status===st).length;
 const blockers=[["Pending projects",cnt("Pending")],["Missing projects",cnt("Missing")],["Unresolved import conflicts",m.filter(x=>x.import_state==="Changed").length],["Slots not in system",Math.max(0,total-m.length)]].filter(x=>(x[1] as number)>0);
 if(!blockers.length&&bx.status==="Archived")return R.json({error:"Box is already fully Archived; force close is not needed."},{status:409});
 if(!why)return R.json({error:"Box is not fully archived: "+blockers.map(x=>`${x[0]} (${x[1]})`).join(", ")+".",blockers,canOverride:true},{status:409});
 const snap={status:bx.status,archived:cnt("Archived"),pending:cnt("Pending"),missing:cnt("Missing"),total_slots:total,blockers};
 const e=await s.from("archive_boxes").update({force_closed:true,force_closed_at:now,force_closed_by:u.uid??null,force_close_reason:why,override_reason:why,updated_at:now}).eq("id",bx.id);if(e.error)return R.json({error:e.error.message},{status:500});
 const ev=await s.from("force_close_events").insert({box_id:bx.id,box_code:code,actor_id:u.uid??null,reason:why,status_snapshot:snap});if(ev.error)return R.json({error:"Force close saved but event log failed: "+ev.error.message},{status:500});
 await s.from("audit_logs").insert({actor_id:u.uid??null,action:"Box force-closed",entity_type:"box",entity_id:code,reason:why,before_data:{status:bx.status},after_data:snap});
 return R.json({ok:true})}
