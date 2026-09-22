-- Refresh the public activity highlights with selected, image-led moments.
-- The complete written chronology remains on the records page; these rows are
-- intentionally curated for the more visual activity highlights page.

update public.activity_events
set slug = '2011-genealogy-workshop',
    title_zh = '建谱研习班：从一张谱表开始',
    title_en = 'The genealogy workshops begin',
    summary_zh = '第二场建谱研习班由陈业雄主讲。大家把手上的家族资料摊开，从人物、支系和谱式开始，一步步讨论怎样把零散记忆整理成可以传给下一代的记录。',
    summary_en = 'The second genealogy workshop was led by Chen Yexiong. Participants opened their family sources and worked through people, branches, formats, and the first steps of turning scattered memories into a record for the next generation.',
    event_date = '2011-07-07',
    date_label_zh = '2011.07.07',
    date_label_en = '7 Jul 2011',
    location_zh = null,
    location_en = null,
    image_path = '/events/genealogy-workshop-2011.jpg',
    image_alt_zh = '陈业雄在研习班讲解世系图',
    image_alt_en = 'Chen Yexiong explaining a genealogy chart at a workshop',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 10
where slug = '2011-genealogy-workshop';

update public.activity_events
set title_zh = '研习班：把族谱文化带进家庭',
    title_en = 'Workshops and the Chinese genealogy talk',
    summary_zh = '这一年连续举行建谱研习班，并在国家图书馆分享华族谱系。参与者带来旧谱、照片和家中流传的称呼，在一场场讨论里把“修谱”从书本知识变成家人可以一起做的事。',
    summary_en = 'The year brought a run of genealogy workshops and a Chinese genealogy talk at the National Library. Participants brought old books, photographs, and family names, making genealogy a practice families could do together.',
    event_date = '2014-03-14',
    date_label_zh = '2014.03—09',
    date_label_en = 'Mar—Sep 2014',
    location_zh = '研习班及国家图书馆',
    location_en = 'Workshops and the National Library',
    image_path = '/events/genealogy-workshop-2014.jpg',
    image_alt_zh = '建谱研习班参加者合影',
    image_alt_en = 'Participants at a genealogy workshop',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 20
where slug = '2014-workshops-and-talks';

update public.activity_events
set slug = '2016-family-culture-talk',
    title_zh = '家谱、修养与家庭文化',
    title_en = 'Genealogy, character, and family culture',
    summary_zh = '讲座把家谱放回日常生活：一张家谱不只是名字的排列，也记录一个家庭怎样看待长辈、记住来处，并把家风交给下一代。',
    summary_en = 'The talk placed genealogy back in everyday life: a family record is more than a list of names. It shows how a family remembers elders, understands where it came from, and passes on its values.',
    event_date = '2016-03-16',
    date_label_zh = '2016.03.16',
    date_label_en = '16 Mar 2016',
    location_zh = '喜耀文化学会',
    location_en = 'Cultural venue',
    image_path = '/events/family-genealogy-talk-2016.jpg',
    image_alt_zh = '家谱与家庭文化分享现场',
    image_alt_en = 'A family genealogy and culture sharing session',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 30
where slug = '2016-society-launch';

update public.activity_events
set slug = '2018-new-year-gathering',
    title_zh = '新年聚餐：在饭桌上继续讲家族故事',
    title_en = 'New Year gathering: family stories around the table',
    summary_zh = '新年聚餐把研习班里认识的朋友聚在一起。饭桌上的谈话从近况说到祖籍、方言和家中保存的旧照片，许多后来写进家谱的线索，就是这样在轻松的聊天里被重新想起。',
    summary_en = 'The New Year gathering brought workshop friends around one table. Conversation moved from everyday life to ancestral places, dialects, and old photographs; many clues later recorded in family genealogies surfaced in these relaxed exchanges.',
    event_date = '2018-02-22',
    date_label_zh = '2018.02.22',
    date_label_en = '22 Feb 2018',
    location_zh = '新年聚餐',
    location_en = 'New Year gathering',
    image_path = '/events/new-year-gathering-2018.jpg',
    image_alt_zh = '根缘文化学会新年聚餐合影',
    image_alt_en = 'Roots Culture Society New Year gathering',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 40
where slug = '2017-registration-and-talk';

update public.activity_events
set slug = '2018-cultural-exchange',
    title_zh = '文化交流：在文物馆相遇',
    title_en = 'Cultural exchange at a heritage gallery',
    summary_zh = '学会受邀参加新加坡广惠肇碧山亭文物馆开幕。不同社群在同一个文化场合相遇，也让我们更清楚地看见：家族记忆不是孤立保存的，它属于新加坡共同的历史景观。',
    summary_en = 'The Society joined the opening of the Singapore Kwong Wai Shiu Peck San Theng Heritage Gallery. Meeting other communities in a shared cultural space showed how family memory belongs within Singapore’s wider historical landscape.',
    event_date = '2018-03-06',
    date_label_zh = '2018.03.06',
    date_label_en = '6 Mar 2018',
    location_zh = '新加坡广惠肇碧山亭文物馆',
    location_en = 'Singapore Kwong Wai Shiu Peck San Theng Heritage Gallery',
    image_path = '/events/cultural-exchange-2018.jpg',
    image_alt_zh = '文化场馆开幕交流合影',
    image_alt_en = 'A cultural exchange at a heritage gallery opening',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 50
where slug = '2018-community-exchange';

update public.activity_events
set slug = '2019-external-exchange',
    title_zh = '对外交流：把家族记录带进公共文化',
    title_en = 'External exchange: bringing family records into public culture',
    summary_zh = '学会先后与教育部母语司、宗乡会馆联合总会交流，介绍建修家谱和相册家谱的实践。交流让家谱不只停留在家庭内部，也进入教育、社群和文化传承的公共讨论。',
    summary_en = 'The Society met with the Ministry of Education’s Mother Tongue Languages Division and the Singapore Federation of Chinese Clan Associations to share its work on genealogy and Photo Genealogy, bringing family records into wider educational and cultural conversations.',
    event_date = '2019-01-07',
    date_label_zh = '2019.01.07',
    date_label_en = '7 Jan 2019',
    location_zh = '宗乡会馆联合总会',
    location_en = 'Singapore Federation of Chinese Clan Associations',
    image_path = '/events/external-exchange-2019.jpg',
    image_alt_zh = '学会与文化机构交流合影',
    image_alt_en = 'Society members at an external cultural exchange',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 60
where slug = '2019-external-exchanges';

update public.activity_events
set image_path = '/events/cultural-gathering-02.jpg',
    image_alt_zh = '海南寻根与宗亲交流',
    image_alt_en = 'A Hainan roots journey and clan exchange',
    source_url = null,
    source_label_zh = null,
    source_label_en = null,
    sort_order = 70
where slug = '2024-hainan-roots-journey';
