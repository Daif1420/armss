-- ARMS requirements alignment migration (apply after schema.sql)
-- Converts legacy lifecycle values to the strict Archive / Missing / Pending model.
alter table public.archive_boxes add column if not exists force_closed boolean not null default false;
alter table public.archive_boxes add column if not exists force_closed_at timestamptz;
alter table public.archive_boxes add column if not exists force_closed_by uuid references public.profiles(id);
alter table public.archive_boxes add column if not exists force_close_reason text;

-- Statuses are text with explicit checks to avoid legacy enum values leaking into the new workflow.
alter table public.projects alter column status drop default;
alter table public.projects alter column status type text using
  (case status::text when 'Completed' then 'Archived' when 'Ready for Delivery' then 'Archived'
    when 'Delivered' then 'Archived' when 'In Progress' then 'Archived' when 'On Hold' then 'Pending'
    else status::text end);
alter table public.projects alter column status set default 'Pending';
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check check(status in ('Archived','Missing','Pending'));

alter table public.dossiers alter column status drop default;
alter table public.dossiers alter column status type text using
  (case status::text when 'Completed' then 'Archived' when 'In Progress' then 'Inprogress'
    when 'Ready for Delivery' then 'Inprogress' when 'Delivered' then 'Archived'
    when 'On Hold' then 'Pending' else status::text end);
alter table public.dossiers alter column status set default 'Pending';
alter table public.dossiers drop constraint if exists dossiers_status_check;
alter table public.dossiers add constraint dossiers_status_check check(status in ('Pending','Inprogress','Archived'));

alter table public.archive_boxes alter column status drop default;
alter table public.archive_boxes alter column status type text using
  (case status::text when 'Completed' then 'Archived' when 'Closed' then 'Archived'
    when 'Delivered' then 'Archived' when 'Ready for Delivery' then 'Inprogress'
    when 'Open' then 'Inprogress' when 'In Progress' then 'Inprogress'
    else 'Inprogress' end);
alter table public.archive_boxes alter column status set default 'Inprogress';
alter table public.archive_boxes drop constraint if exists archive_boxes_status_check;
alter table public.archive_boxes add constraint archive_boxes_status_check check(status in ('Inprogress','Archived'));

-- Source workbook date delivery is the user-facing Date Approved field.
alter table public.projects add column if not exists date_approved date;
update public.projects set date_approved=date_of_delivery where date_approved is null and date_of_delivery is not null;

-- Force-close is an event/flag, not a Box status. Preserve prior override details when present.
update public.archive_boxes set force_closed=true,force_close_reason=override_reason
 where override_reason is not null and btrim(override_reason)<>'';

-- A box's six dossier slots and all 300 project slots are stable and sequential.
create or replace function public.arms_create_expected_slots(p_box_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare b public.archive_boxes%rowtype; d_id uuid; d smallint; first_id bigint; job bigint;
begin
 select * into b from public.archive_boxes where id=p_box_id for update;
 if not found or b.first_job_id is null then raise exception 'Box or First Project Number is missing'; end if;
 if b.last_job_id is distinct from b.first_job_id+299 then
   raise exception 'A box must span exactly 300 consecutive project numbers';
 end if;
 for d in 1..6 loop
   first_id:=b.first_job_id+(d-1)*50;
   insert into public.dossiers(box_id,dossier_number,first_job_id,last_job_id,status)
   values(b.id,d,first_id,first_id+49,'Pending')
   on conflict(box_id,dossier_number) do update set first_job_id=excluded.first_job_id,last_job_id=excluded.last_job_id
   returning id into d_id;
   for job in first_id..first_id+49 loop
     insert into public.projects(job_id,box_id,dossier_id,status,archive_flag,import_state,source_payload)
     values(job,b.id,d_id,'Pending',false,'New','{}'::jsonb)
     on conflict(job_id) do update set
       box_id=coalesce(public.projects.box_id,excluded.box_id),
       dossier_id=coalesce(public.projects.dossier_id,excluded.dossier_id);
   end loop;
 end loop;
end $$;

create or replace function public.arms_recalculate_box(p_box_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare d record; c_arch integer; c_total integer; c_later boolean;
begin
 -- For expected slots: a missing number is proven only when a later imported/archived Job ID exists.
 update public.projects p set status=case
   when p.source_payload <> '{}'::jsonb or p.job_name is not null or p.branch_name is not null
        or p.total_boxes is not null or p.total_documents is not null or p.total_sheets is not null
        or p.date_of_delivery is not null or p.date_approved is not null then 'Archived'
   when exists(select 1 from public.projects later where later.box_id=p_box_id and later.job_id>p.job_id
       and (later.source_payload <> '{}'::jsonb or later.job_name is not null or later.branch_name is not null
        or later.total_boxes is not null or later.total_documents is not null or later.total_sheets is not null
        or later.date_of_delivery is not null or later.date_approved is not null)) then 'Missing'
   else 'Pending' end
 where p.box_id=p_box_id;

 for d in select id from public.dossiers where box_id=p_box_id loop
   select count(*) filter(where status='Archived'),count(*) into c_arch,c_total from public.projects where dossier_id=d.id;
   update public.dossiers set status=case when c_arch=0 then 'Pending' when c_arch=50 then 'Archived' else 'Inprogress' end where id=d.id;
 end loop;
 select count(*) filter(where status='Archived'),count(*) into c_arch,c_total from public.projects where box_id=p_box_id;
 update public.archive_boxes set status=case when c_arch=300 and c_total=300 then 'Archived' else 'Inprogress' end,
   updated_at=now() where id=p_box_id;
end $$;

-- Create expected slots for existing boxes only when they already have a full, configured 300-project range.
do $$ declare x record; begin
 for x in select id from public.archive_boxes where first_job_id is not null and last_job_id=first_job_id+299 loop
   perform public.arms_create_expected_slots(x.id);
   perform public.arms_recalculate_box(x.id);
 end loop;
end $$;

create table if not exists public.force_close_events(
 id uuid primary key default gen_random_uuid(),
 box_id uuid not null references public.archive_boxes(id) on delete restrict,
 box_code text not null,
 actor_id uuid references public.profiles(id),
 reason text not null check(length(btrim(reason))>0),
 status_snapshot jsonb not null,
 created_at timestamptz not null default now()
);
create index if not exists force_close_events_box_idx on public.force_close_events(box_id,created_at desc);

-- Record import metadata for audit and support a source upload name on each project.
alter table public.projects add column if not exists source_upload text;
alter table public.projects add column if not exists first_import_at timestamptz;
alter table public.projects add column if not exists last_update_at timestamptz;
update public.projects set first_import_at=created_at where first_import_at is null;
update public.projects set last_update_at=updated_at where last_update_at is null;


-- Normalize supported application roles. "System Manager" is the legacy display name
-- for the requirements' System Admin role; retain it for existing session compatibility.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
 check(role in ('System Manager','System Admin','Archive Manager','Data Entry','Viewer','Supervisor','User'));

create or replace function public.arms_sync_approved_date()
returns trigger language plpgsql as $$
begin
 if new.date_approved is null then new.date_approved:=new.date_of_delivery;
 elsif new.date_of_delivery is null then new.date_of_delivery:=new.date_approved;
 end if;
 return new;
end $$;
drop trigger if exists arms_sync_approved_date on public.projects;
create trigger arms_sync_approved_date before insert or update of date_approved,date_of_delivery
on public.projects for each row execute function public.arms_sync_approved_date();
