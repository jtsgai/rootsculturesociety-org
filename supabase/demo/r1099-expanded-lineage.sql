-- One-time synthetic demonstration data for member R1099.
-- This file contains no credentials and is safe to rerun: rows are matched by book and name.

begin;

with target as (
  select g.id as book_id from public.genealogy_books g
  join public.members m on m.id = g.member_id where m.member_id = 'R1099'
), demo (
  name, generation_number, sex, life_status,
  birth_date, death_date, residence_code, genealogy_markers,
  occupation, education, phone, address, note,
  father_name, mother_name, spouse_name
) as (values
('拓文福',1,'male','living','1946-05-18',null,'S',array[]::text[],'社区餐饮与会馆志愿服务','新加坡职业教育课程','+65 8004 1099','大巴窑家庭住址','1965 年来新加坡工作，后来在大巴窑定居；晚年负责讲述第一代兄弟南来的经历。',null,null,'陈月华'),
('陈月华',1,'female','living','1949-08-02',null,'S',array[]::text[],'家庭相片与纪念册整理','新加坡中学教育','+65 8005 1099','大巴窑家庭住址','保存孩子的学校纪念册，并坚持在照片背面写下日期、地点和人物。',null,null,'拓文福'),
('拓文成',1,'male','deceased','1935-03-12','2018-11-06',null,array[]::text[],'芽笼杂货与熟食店经营','海南私塾及新加坡夜校','', '芽笼旧店屋','1961 年从海南文昌南来，在芽笼经营杂货与熟食；晚年把旧信件、船票和照片交给下一代整理。',null,null,'林秀兰'),
('林秀兰',1,'female','deceased','1938-09-21','2020-02-14',null,array[]::text[],'家庭账本与节庆记录','海南文昌私塾','', '芽笼旧店屋','随家人南来后照看店屋和账本，把节庆茶点、称呼和家中规矩教给下一代。',null,null,'拓文成'),
('拓文兴',1,'male','deceased','1939-07-04','2011-04-19',null,array[]::text[],'小型修理铺经营','海南文昌私塾','', '大巴窑旧居','年轻时在海南务农，后来在新加坡经营修理铺，保存兄弟往来的家书和会馆收据。',null,null,'吴金兰'),
('吴金兰',1,'female','deceased','1942-12-16','2019-06-08',null,array[]::text[],'家庭物件保管与节庆料理','家传针线与家务技艺','', '大巴窑旧居','保管家中旧木牌、茶具和布料，也负责记录清明与春节的家庭准备。',null,null,'拓文兴'),

('拓志远',2,'male','living','1972-03-20',null,'S',array['continuing'],'社区影像记录','新加坡传播与媒体课程','+65 8010 1099','大巴窑家庭住址','拓文福与陈月华的长子，负责持续整理这一支的相片、口述和家庭聚会记录。','拓文福','陈月华','周慧君'),
('周慧君',2,'female','living','1974-10-11',null,'S',array[]::text[],'节庆饮食与家庭菜谱记录','新加坡餐饮与社区课程','+65 8011 1099','大巴窑家庭住址','重视节庆和餐桌记忆，收集几代人的菜谱、食器和聚餐照片。',null,null,'拓志远'),
('拓志芳',2,'female','living','1976-06-15',null,'M',array['unreachable'],'早年从事会计工作','新加坡商业课程','', '马来西亚新山（旧记录）','拓文福与陈月华的女儿，婚后迁居新山；近年联络中断，资料来自旧通讯录和家人口述。','拓文福','陈月华','王国强'),
('王国强',2,'male','living','1973-01-28',null,'M',array[]::text[],'物流管理','马来西亚技术学院','', '马来西亚新山','拓志芳的丈夫，曾协助保存两家往来的节庆照片。',null,null,'拓志芳'),

('拓志明',2,'male','living','1964-02-09',null,'S',array['distinguished'],'社区档案整理','新加坡文化研究课程','+65 8006 1099','实龙岗家庭住址','长期参与社区档案工作，把拓氏旧信件、店屋照片和长辈口述按年代整理成册。','拓文成','林秀兰','许雅琴'),
('许雅琴',2,'female','living','1967-11-23',null,'S',array[]::text[],'家庭影像与口述资料整理','新加坡图书馆与档案课程','+65 8007 1099','实龙岗家庭住址','协助辨认旧照片中的人物，并把海南话称呼与华语姓名并列记录。',null,null,'拓志明'),
('拓志华',2,'female','living','1966-08-30',null,'HK',array[]::text[],'服装采购与家庭联络','新加坡商科教育','+852 8008 1099','香港家庭住址','拓文成与林秀兰的女儿，婚后居香港，仍定期把家庭照片和节庆近况寄回新加坡。','拓文成','林秀兰','李国安'),
('李国安',2,'male','living','1964-12-05',null,'HK',array[]::text[],'工程项目管理','香港理工课程','+852 8009 1099','香港家庭住址','拓志华的丈夫，协助整理香港一支的地址与年代资料。',null,null,'拓志华'),

('拓志安',2,'male','living','1968-04-16',null,'S',array[]::text[],'电器维修工作室经营','新加坡理工教育','+65 8012 1099','宏茂桥家庭住址','拓文兴与吴金兰的长子，保留父亲修理铺的工具、客户簿和工作照片。','拓文兴','吴金兰','林美珍'),
('林美珍',2,'female','living','1970-09-07',null,'S',array[]::text[],'社区图书馆资料整理','新加坡文科教育','+65 8013 1099','宏茂桥家庭住址','把家族口述故事、照片与物件逐一编号，方便年轻一代查询。',null,null,'拓志安'),
('拓志玲',2,'female','deceased','1971-05-13','1984-08-24',null,array['died_young'],'学生','新加坡小学及中学','', '大巴窑旧居','拓文兴与吴金兰的女儿，十三岁病逝；家中保留她的学生证、成绩册和一张全家福。','拓文兴','吴金兰',null),

('拓嘉慧',3,'female','living','1998-03-12',null,'S',array['no_descendants'],'方言与家肴故事记录','新加坡人文与传播课程','+65 8020 1099','大巴窑家庭住址','拓志远与周慧君的女儿，明确选择不育，把时间用于记录长辈方言和家肴故事。','拓志远','周慧君',null),
('王思颖',3,'female','living','2001-07-19',null,'UK',array[]::text[],'博物馆教育','英国文化遗产课程','+44 800 1099','英国伦敦家庭住址','拓志芳与王国强的女儿，在英国求学和工作，负责整理母亲一支的跨国照片。','王国强','拓志芳',null),
('拓嘉宁',3,'male','living','1992-06-22',null,'S',array['compiler'],'视觉设计与家族档案整理','新加坡视觉传达课程','+65 8014 1099','实龙岗家庭住址','本册立谱者。把祖父母留下的相片、家书、录音和三代关系整理成相册家谱。','拓志明','许雅琴',null),
('李敏慧',3,'female','living','1994-09-18',null,'US',array[]::text[],'数码内容策划','美国媒体研究课程','+1 800 1099','美国旧金山家庭住址','拓志华与李国安的女儿，保存香港一支的数码相片，并定期补充英文说明。','李国安','拓志华',null),
('拓嘉豪',3,'male','living','1995-01-27',null,'S',array[]::text[],'影像制作与数码档案','新加坡媒体制作课程','+65 8015 1099','宏茂桥家庭住址','拓志安与林美珍的儿子，负责拍摄家庭聚会和扫描修理铺留下的工作记录。','拓志安','林美珍',null)
)
merge into public.people p
using (select target.book_id, demo.* from target cross join demo) d
on p.book_id = d.book_id and p.name = d.name
when matched then update set
    generation_number = d.generation_number,
    sex = d.sex,
    life_status = d.life_status,
    birth_year = extract(year from d.birth_date::date)::integer,
    birth_date = d.birth_date::date,
    death_date = d.death_date::date,
    residence_code = d.residence_code,
    genealogy_markers = d.genealogy_markers,
    occupation = d.occupation,
    education = d.education,
    phone = d.phone,
    address = d.address,
    note = d.note
when not matched then insert (
    book_id, name, generation_number, sex, life_status, birth_year,
    birth_date, death_date, residence_code, genealogy_markers,
    occupation, education, phone, address, note
  ) values (
    d.book_id, d.name, d.generation_number, d.sex, d.life_status,
    extract(year from d.birth_date::date)::integer, d.birth_date::date, d.death_date::date,
    d.residence_code, d.genealogy_markers, d.occupation, d.education,
    d.phone, d.address, d.note
  );

with target as (
  select g.id as book_id from public.genealogy_books g
  join public.members m on m.id = g.member_id where m.member_id = 'R1099'
), relations (name, father_name, mother_name, spouse_name) as (values
  ('拓文福',null,null,'陈月华'),('陈月华',null,null,'拓文福'),
  ('拓文成',null,null,'林秀兰'),('林秀兰',null,null,'拓文成'),
  ('拓文兴',null,null,'吴金兰'),('吴金兰',null,null,'拓文兴'),
  ('拓志远','拓文福','陈月华','周慧君'),('周慧君',null,null,'拓志远'),
  ('拓志芳','拓文福','陈月华','王国强'),('王国强',null,null,'拓志芳'),
  ('拓志明','拓文成','林秀兰','许雅琴'),('许雅琴',null,null,'拓志明'),
  ('拓志华','拓文成','林秀兰','李国安'),('李国安',null,null,'拓志华'),
  ('拓志安','拓文兴','吴金兰','林美珍'),('林美珍',null,null,'拓志安'),
  ('拓志玲','拓文兴','吴金兰',null),
  ('拓嘉慧','拓志远','周慧君',null),('王思颖','王国强','拓志芳',null),
  ('拓嘉宁','拓志明','许雅琴',null),('李敏慧','李国安','拓志华',null),
  ('拓嘉豪','拓志安','林美珍',null)
)
update public.people p set
    father_id = father.id,
    mother_id = mother.id,
    spouse_id = spouse.id
from relations d
cross join target
left join public.people father on father.book_id = target.book_id and father.name = d.father_name
left join public.people mother on mother.book_id = target.book_id and mother.name = d.mother_name
left join public.people spouse on spouse.book_id = target.book_id and spouse.name = d.spouse_name
where p.book_id = target.book_id and p.name = d.name;

commit;
