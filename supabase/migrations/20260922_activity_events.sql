-- Activity highlights managed by the Society.
-- Public visitors can read published records. Administrators can create,
-- edit, publish, unpublish, and remove records. The editor table reserves a
-- controlled path for a specific active member to be authorised later.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title_zh text not null check (char_length(trim(title_zh)) between 1 and 240),
  title_en text not null check (char_length(trim(title_en)) between 1 and 240),
  summary_zh text not null default '',
  summary_en text not null default '',
  event_date date,
  date_label_zh text,
  date_label_en text,
  location_zh text,
  location_en text,
  image_path text,
  image_alt_zh text,
  image_alt_en text,
  source_url text,
  source_label_zh text,
  source_label_en text,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_event_editors (
  event_id uuid not null references public.activity_events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);

create index if not exists activity_events_public_order_idx
  on public.activity_events (is_published, sort_order, event_date desc);

create or replace function public.can_manage_activity_events()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or (
      public.is_active_member()
      and exists (
        select 1 from public.activity_event_editors
        where profile_id = auth.uid()
      )
    );
$$;

grant execute on function public.can_manage_activity_events() to authenticated;

drop trigger if exists activity_events_updated_at on public.activity_events;
create trigger activity_events_updated_at before update on public.activity_events
for each row execute procedure public.set_updated_at();

alter table public.activity_events enable row level security;
alter table public.activity_event_editors enable row level security;

drop policy if exists "activity events: public reads published" on public.activity_events;
create policy "activity events: public reads published" on public.activity_events
for select to anon, authenticated
using (is_published or public.can_manage_activity_events());

drop policy if exists "activity events: authorised editors manage" on public.activity_events;
create policy "activity events: authorised editors manage" on public.activity_events
for all to authenticated
using (public.can_manage_activity_events())
with check (public.can_manage_activity_events());

drop policy if exists "activity event editors: self reads" on public.activity_event_editors;
create policy "activity event editors: self reads" on public.activity_event_editors
for select to authenticated
using (public.is_admin() or profile_id = auth.uid());

drop policy if exists "activity event editors: admins manage" on public.activity_event_editors;
create policy "activity event editors: admins manage" on public.activity_event_editors
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Initial activity material, curated from the Society's existing workshop,
-- members' meeting, exchange, and roots-journey records. The guarded inserts
-- make the migration safe to run once in a project that already has data.
insert into public.activity_events (
  slug, title_zh, title_en, summary_zh, summary_en, date_label_zh, date_label_en,
  source_url, source_label_zh, source_label_en, is_published, sort_order, image_path,
  image_alt_zh, image_alt_en
)
select * from (values
  ('2011-genealogy-workshop', '建谱研习班留下第一批活动记录', 'The genealogy workshops begin', '2011 年 7 月 7 日举行第二场建谱研习班，由陈业雄主讲，参与者从家族资料、谱式与记录方法开始学习。', 'The second genealogy workshop was held on 7 July 2011, led by Chen Yexiong. Participants began with family sources, formats, and methods of record-keeping.', '2011', '2011', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 10, null, null, null),
  ('2014-workshops-and-talks', '研习班与国家图书馆华族谱系讲座', 'Workshops and the Chinese genealogy talk', '这一年的记录包括第三至第六场建谱研习班，以及在国家图书馆举行的华族谱系讲座，内容从修谱经验延伸到姓氏故事与族谱格式。', 'The year included the third to sixth genealogy workshops and a Chinese genealogy talk at the National Library, covering genealogy practice, surname stories, and formats.', '2014', '2014', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 20, null, null, null),
  ('2016-society-launch', '开族传世宗谱与根缘文化学会发起', 'Founding genealogies and the Society’s launch', '活动资料记录了“开族传世宗谱”、家庭文化讲座，以及 2016 年 7 月 26 日根缘文化学会发起成立的过程。', 'The records include talks on founding genealogies and family culture, followed by the launch of Roots Culture Society on 26 July 2016.', '2015—2016', '2015—2016', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 30, null, null, null),
  ('2017-registration-and-talk', '学会注册与“建修家谱，人人有责”讲座', 'Registration and a genealogy talk', '学会于 2017 年完成正式注册，并在南洋理工大学举行“建修家谱，人人有责”讲座，把建谱从个人兴趣带进公共文化讨论。', 'The Society completed formal registration in 2017 and held a “Genealogy is everyone’s responsibility” talk at Nanyang Technological University.', '2017', '2017', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 40, null, null, null),
  ('2018-community-exchange', '讲座、就职仪式与社群交流', 'Talks, an inauguration, and community exchange', '这一年有相册家谱、家庭文化与通用软件建谱等讲座，也有新执委就职仪式、新年聚餐，以及与文化场馆和海南社群的交流。', 'The year brought talks on Photo Genealogy, family culture, and using everyday software to build a genealogy, alongside an inauguration, a New Year gathering, and community exchanges.', '2018', '2018', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 50, '/events/cultural-gathering-01.jpg', '学会文化活动现场', 'A Society cultural gathering'),
  ('2019-external-exchanges', '对外交流与会员大会', 'External exchanges and the members’ meeting', '资料记录了学会与教育部母语司、宗乡总会的交流，以及 2019 年 2 月 22 日在琼崖黄氏公会举行的会员大会活动。', 'The records include exchanges with the Ministry of Education’s Mother Tongue Languages Division and SFCCA, followed by the members’ meeting held on 22 February 2019.', '2019', '2019', '/events/roots-culture-member-meeting-activity-report.pptx', '查看活动资料', 'View activity record', true, 60, null, null, null),
  ('2024-hainan-roots-journey', '海南寻根与宗亲交流', 'A Hainan roots journey and clan exchange', '黄氏家族组织老少成员到海南文昌、公坡镇寻根，并与文昌黄氏大宗祠交流；旅程把祖籍地、家族口述与当代家庭重新连在一起。', 'A Huang family roots journey brought several generations to Wenchang and Gongpo in Hainan for an exchange with the Wenchang Huang Clan Ancestral Hall, linking ancestral place, oral history, and family life today.', '2024', '2024', '/articles/roots-culture-huang-liangnan.pdf', '查看相关资料', 'View related material', true, 70, '/events/cultural-gathering-02.jpg', '活动交流合影', 'Conversation at a cultural gathering')
) as seed(slug, title_zh, title_en, summary_zh, summary_en, date_label_zh, date_label_en, source_url, source_label_zh, source_label_en, is_published, sort_order, image_path, image_alt_zh, image_alt_en)
where not exists (select 1 from public.activity_events existing where existing.slug = seed.slug);
