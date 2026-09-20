export type Lang = 'zh' | 'en';
export type PageKey =
  | 'about'
  | 'committee'
  | 'method'
  | 'publications'
  | 'stories'
  | 'events'
  | 'membership'
  | 'privacy'
  | 'terms'
  | 'contact';

export const nav = [
  { key: 'about', zh: '学会', en: 'The Society' },
  { key: 'method', zh: '相册家谱', en: 'Photo Genealogy' },
  { key: 'publications', zh: '出版', en: 'Publications' },
  { key: 'stories', zh: '故事', en: 'Stories' },
  { key: 'events', zh: '活动', en: 'Events' },
  { key: 'membership', zh: '入会', en: 'Membership' },
];

export const committee = [
  { zh: '陈业雄', en: 'Chen Yexiong', roleZh: '会长', roleEn: 'President', image: '/committee/chen-yexiong.jpg', altZh: '陈业雄', altEn: 'Chen Yexiong' },
  { zh: '锺瑞忠', en: 'Zhong Ruizhong', roleZh: '副会长', roleEn: 'Vice-President', image: '/committee/zhong-ruizhong.jpg', altZh: '锺瑞忠', altEn: 'Zhong Ruizhong' },
  { zh: '陈泽南', en: 'Chen Zenan', roleZh: '财务长', roleEn: 'Treasurer', image: '/committee/chen-zenan.jpg', altZh: '陈泽南', altEn: 'Chen Zenan' },
  { zh: '锺骏源', en: 'Ian Chung', roleZh: '秘书长', roleEn: 'Secretary', image: '/committee/ian-chung.jpg', altZh: '锺骏源', altEn: 'Ian Chung' },
  { zh: '拓劲涛', en: 'Tuo Jintao', roleZh: '助理秘书长', roleEn: 'Assistant Secretary', image: '/committee/tuo-jintao.jpg', altZh: '拓劲涛', altEn: 'Tuo Jintao' },
  { zh: '蔡仑宗', en: 'Cai Lun Zong', roleZh: '委员', roleEn: 'Committee Member', image: '/committee/cai-lunzong.jpg', altZh: '蔡仑宗', altEn: 'Cai Lun Zong' },
];

export const activityMoments = [
  { image: '/events/cultural-gathering-01.jpg', zh: '学会文化活动现场', en: 'A Society cultural gathering' },
  { image: '/events/cultural-gathering-02.jpg', zh: '活动交流合影', en: 'Conversation at a Society activity' },
];

export const publications = [
  {
    year: '2025',
    titleZh: '《传灯》',
    titleEn: 'Chuan Deng',
    image: '/publications/chuan-deng-2025-book.jpg',
    altZh: '《传灯》2025 书本展示',
    altEn: 'Chuan Deng 2025 book display',
    descriptionZh: '与新加坡海南会馆、琼州天后宫联合出版。',
    descriptionEn: 'Published with Singapore Hainan Hwee Kuan and Kheng Chiu Tin Hou Kong.',
    relatedFile: 'roots-culture-passing-the-torch-chen-jiancun.pdf',
    relatedZh: '下载相关文章：根缘文化薪火相传',
    relatedEn: 'Download related article: Roots Culture: Passing the Torch',
  },
  {
    year: '2026',
    titleZh: '《相册家谱》',
    titleEn: 'Photo Genealogy',
    image: '/publications/photo-genealogy-2026-book.jpg',
    altZh: '《相册家谱》2026 书本展示',
    altEn: 'Photo Genealogy 2026 book display',
    descriptionZh: '学会出版，把家族记忆整理成可阅读、可传承的相册家谱。',
    descriptionEn: 'A Society publication that turns family memory into a readable record to carry forward.',
    relatedFile: 'eight-methods-singapore-photo-genealogy-sample.pdf',
    relatedZh: '下载相关样本：建修新加坡相册家谱的八大招',
    relatedEn: 'Download related sample: Eight Methods for a Singapore Photo Genealogy',
  },
];

export const activityRecords = [
  {
    year: '2010',
    zh: '新加坡族谱学会成立与推广',
    en: 'Formation and outreach of the Singapore Genealogy Society',
    zhText: '资料记载，几位志趣相投的朋友组织成立新加坡族谱学会，并开展联系会馆、谱法讲座与展览等推广工作。',
    enText: 'The source account records the formation of the Singapore Genealogy Society by a group of friends, followed by outreach to clan associations, genealogy talks and exhibitions.',
    sourceFile: 'roots-culture-passing-the-torch-chen-jiancun.pdf',
  },
  {
    year: '2015—2022',
    zh: '黄氏相册家谱的持续修订',
    en: 'The Huang family Photo Genealogy in revision',
    zhText: '黄良南的文章记录，黄氏家族于 2015 年发布首版相册家谱，并在 2022 年发布第八版。',
    enText: 'Huang Liangnan records that the Huang family published its first Photo Genealogy in 2015 and its eighth edition in 2022.',
    sourceFile: 'roots-culture-huang-liangnan.pdf',
  },
  {
    year: '2024',
    zh: '海南寻根与宗亲交流',
    en: 'A Hainan roots journey and clan exchange',
    zhText: '资料记录，黄氏家族组织老少成员到海南文昌、公坡镇寻根，并与文昌黄氏大宗祠交流。',
    enText: 'The source account records a Huang family roots journey to Wenchang and Gongpo in Hainan, including an exchange with the Wenchang Huang Clan Ancestral Hall.',
    sourceFile: 'roots-culture-huang-liangnan.pdf',
  },
  {
    year: '2025—2026',
    zh: '相册家谱出版资料',
    en: 'Photo Genealogy publication materials',
    zhText: '现有资料包括《传灯》与《相册家谱》书封，以及相册家谱方法样本。正式活动日期与地点待确认后再发布。',
    enText: 'The current materials include the covers of Chuan Deng and Photo Genealogy, together with a Photo Genealogy methods sample. Formal event dates and venues will be published when confirmed.',
    sourceFile: 'eight-methods-singapore-photo-genealogy-sample.pdf',
  },
];

export const memberMeetingRecords = [
  {
    year: '2011',
    zh: '建谱研习班开始留下活动记录',
    en: 'The genealogy workshops begin',
    zhText: '报告记录 2011 年 7 月 7 日举行第二场建谱研习班，由陈业雄主讲。',
    enText: 'The report records the second genealogy workshop on 7 July 2011, led by Chen Yexiong.',
  },
  {
    year: '2014',
    zh: '建谱研习班与公开讲座',
    en: 'Genealogy workshops and public talks',
    zhText: '2014 年的记录包括第三至第六场建谱研习班，以及在国家图书馆举行的华族谱系讲座；主题涉及修谱经验、族谱格式、姓氏故事与什么是族谱。',
    enText: 'The 2014 records include the third to sixth genealogy workshops and a Chinese genealogy talk at the National Library. Topics covered genealogy practice, formats, surname stories and the meaning of a genealogy.',
  },
  {
    year: '2015—2016',
    zh: '开族传世宗谱与根缘文化学会发起',
    en: 'Founding genealogies and the Society’s launch',
    zhText: '记录包括“开族传世宗谱”、家谱与家庭文化讲座，以及 2016 年 7 月 26 日陈业雄老师发起成立根缘文化学会的资料。',
    enText: 'The records include talks on founding genealogies, family culture and the launch of Roots Culture Society on 26 July 2016 by Chen Yexiong.',
  },
  {
    year: '2017',
    zh: '注册资料与建修家谱讲座',
    en: 'Registration records and genealogy talks',
    zhText: '报告记载学会于 2017 年 5 月 17 日正式注册，9 月 11 日获批成立，并在南洋理工大学举行“建修家谱，人人有责”讲座。',
    enText: 'The report records formal registration on 17 May 2017 and approval on 11 September, followed by a “Genealogy is everyone’s responsibility” talk at Nanyang Technological University.',
  },
  {
    year: '2018',
    zh: '讲座、就职仪式与社群交流',
    en: 'Talks, an inauguration and community exchange',
    zhText: '2018 年的记录包括相册家谱、家庭文化、通用软件建谱等讲座，新执委就职仪式，新年聚餐，以及受邀参与文化场馆开幕和海南学会会庆。',
    enText: 'The 2018 records include talks on Photo Genealogy, family culture and using common software to build a genealogy, a new committee inauguration, a New Year gathering, and invitations to cultural and community events.',
  },
  {
    year: '2019',
    zh: '对外交流与会员大会活动报告',
    en: 'External exchanges and the members’ meeting report',
    zhText: '报告记录 2019 年初与教育部母语司、宗乡总会的交流，以及 2019 年 2 月 22 日在琼崖黄氏公会举行的会员大会活动报告。',
    enText: 'The report records exchanges with the Ministry of Education’s Mother Tongue Languages Division and the Singapore Federation of Chinese Clan Associations, followed by the members’ meeting activity report held on 22 February 2019.',
  },
];

export const stories = [
  {
    image: '/publications/photo-genealogy-2026-book.jpg',
    altZh: '《相册家谱》书本展示',
    altEn: 'Photo Genealogy book display',
    titleZh: '从“我是谁”追问到家族记忆',
    titleEn: 'From “Who am I?” to family memory',
    bylineZh: '黄良南｜根缘文化',
    bylineEn: 'Huang Liangnan | Roots Culture',
    textZh: '黄良南写下从寻找自我定位，到整理黄氏家族记录的过程；首版相册家谱于 2015 年完成，之后持续补充与修订。',
    textEn: 'Huang Liangnan writes about moving from a question of personal identity to the work of recording the Huang family. The first Photo Genealogy was completed in 2015 and continued through later revisions.',
    sourceFile: 'roots-culture-huang-liangnan.pdf',
  },
  {
    image: '/publications/chuan-deng-2025-book.jpg',
    altZh: '《传灯》书本展示',
    altEn: 'Chuan Deng book display',
    titleZh: '根缘文化薪火相传',
    titleEn: 'Roots Culture: Passing the Torch',
    bylineZh: '陈建存｜2024 年文章',
    bylineEn: 'Chen Jiancun | 2024 article',
    textZh: '文章回顾本地族谱推广、相册家谱的实践，以及以现代、易懂的方式让更多家庭参与建谱修史的想法。',
    textEn: 'This account looks back at genealogy outreach in Singapore, the practice of Photo Genealogy, and the idea of making family history accessible to more households.',
    sourceFile: 'roots-culture-passing-the-torch-chen-jiancun.pdf',
  },
  {
    image: '/events/cultural-gathering-02.jpg',
    altZh: '文化活动中的交流合影',
    altEn: 'Conversation at a cultural gathering',
    titleZh: '迁徙留下的路',
    titleEn: 'The routes migration leaves behind',
    bylineZh: '迁徙观点资料',
    bylineEn: 'Migration perspectives',
    textZh: '从闯关东、填四川、下南洋到走西口，迁徙不仅改变地点，也留下方言、食物、关系与记忆。',
    textEn: 'From Chuang Guandong and Tian Sichuan to going south across the seas and Zou Xikou, migration changes more than place; it leaves dialects, food, relationships and memory.',
    sourceFile: 'migration-views-chuang-guandong-zou-xikou.pdf',
  },
];

export const articles = [
  { file: 'what-is-a-genealogy.pdf', zh: '什么是族谱', en: 'What Is a Genealogy?', zhDescription: '从族谱的基本概念与作用开始阅读。', enDescription: 'An introduction to the meaning and purpose of a genealogy.' },
  { file: 'sg61-manuscript-chen-yexiong.pdf', zh: 'SG61 手稿：当代华裔华社建设开拓', en: 'SG61 Manuscript: Building the Chinese Community', zhDescription: '陈业雄手稿扫描本，讨论 SG61、族谱文化与当代华社建设。', enDescription: 'A scanned manuscript by Chen Yexiong on SG61, genealogy culture and contemporary Chinese community building.' },
  { file: 'roots-culture-passing-the-torch-chen-jiancun.pdf', zh: '根缘文化薪火相传', en: 'Roots Culture: Passing the Torch', zhDescription: '陈建存谈新加坡族谱推广与相册家谱。', enDescription: 'Chen Jiancun on genealogy work in Singapore and Photo Genealogy.' },
  { file: 'chinese-clan-genealogy-culture-sg60-chen-yexiong.pdf', zh: '华族传统族谱文化 SG60', en: 'Chinese Clan Genealogy Culture SG60', zhDescription: '陈业雄著手稿扫描本。', enDescription: 'A scanned manuscript by Chen Yexiong.' },
  { file: 'genealogy-main-contents.pdf', zh: '家谱的主要内容', en: 'The Main Contents of a Genealogy', zhDescription: '认识姓氏起源、世系表、家训等家谱内容。', enDescription: 'An overview of surname origin, lineage tables, family instructions, and related contents.' },
  { file: 'fulfilling-a-contemporary-mission-chen-yexiong.pdf', zh: '履行当代使命：建修族谱宝典', en: 'Fulfilling a Contemporary Mission', zhDescription: '陈业雄关于当代建修族谱的文章。', enDescription: 'Chen Yexiong on building and preserving genealogies today.' },
  { file: 'eight-methods-singapore-photo-genealogy-sample.pdf', zh: '建修新加坡相册家谱的八大招', en: 'Eight Methods for a Singapore Photo Genealogy', zhDescription: '锺开增样本，展示谱首与谱实的编排。', enDescription: 'A Zhong Kaizeng sample showing the front matter and family record sections.' },
  { file: 'roots-culture-huang-liangnan.pdf', zh: '根缘文化', en: 'Roots Culture', zhDescription: '黄良南分享制作相册家谱与寻根的经历。', enDescription: 'Huang Liangnan on making a Photo Genealogy and tracing family roots.' },
  { file: 'zhong-surname-origin.pdf', zh: '百家姓：钟姓来源', en: '百家姓: The Origin of the Zhong Surname', zhDescription: '钟姓来源资料扫描本。', enDescription: 'A scanned reference on the origin of the Zhong surname.' },
  { file: 'photo-genealogy-format-sample.pdf', zh: '相册家谱格式', en: 'Photo Genealogy Format', zhDescription: '新加坡根缘文化学会倡导的相册家谱格式样本。', enDescription: 'A sample of the Photo Genealogy format promoted by the Society.' },
  { file: 'migration-views-chuang-guandong-zou-xikou.pdf', zh: '闯关东、走西口：迁徙观点', en: 'Migration Views: Chuang Guandong and Zou Xikou', zhDescription: '关于华人迁徙历史与路径的文章。', enDescription: 'An article on historical Chinese migration and its routes.' },
];

export const methods = [
  { number: '01', zh: '封面', en: 'Cover', zhText: '先为一本家谱定下名字、开族始祖与献词。', enText: 'Name the book, identify the founding ancestor, and add a short dedication.' },
  { number: '02', zh: '姓氏渊源', en: 'Surname origin', zhText: '从姓氏与祖籍出发，留下家族知道的线索。', enText: 'Begin with the surname and ancestral place, keeping the clues your family knows.' },
  { number: '03', zh: '祖辈迁徙', en: 'Migration', zhText: '把南来、落地、生根的地点和年代排成一条线。', enText: 'Arrange the places and years of coming south, settling, and taking root.' },
  { number: '04', zh: '籍贯文化', en: 'Ancestral culture', zhText: '记录方言、堂号、祖屋、庙宇与宗乡会馆。', enText: 'Record dialect, hall name, ancestral homes, temples, and clan associations.' },
  { number: '05', zh: '世系', en: 'Lineage', zhText: '以人物卡和关系，慢慢搭起自己的世系。', enText: 'Build the lineage patiently, person by person and relationship by relationship.' },
  { number: '06', zh: '童年', en: 'Childhood', zhText: '把在新加坡长大的地点、年代和故事留下来。', enText: 'Keep the places, years, and stories of growing up in Singapore.' },
  { number: '07', zh: '家肴', en: 'Family dishes', zhText: '一道菜也是一条路：记录名字、材料、做法与照片。', enText: 'A dish is also a pathway: record its name, ingredients, method, and photograph.' },
  { number: '08', zh: '族人资料', en: 'Family register', zhText: '补上家人资料；私密内容只留给家族与资料拥有者。', enText: 'Complete the family register; private details stay with the family and its owner.' },
];

export const pageCopy: Record<PageKey, { zh: any; en: any }> = {
  about: {
    zh: { title: '学会的使命是：', deck: '', paragraphs: ['激励族人确立“新加坡华裔”身份认同；以新加坡人建修新加坡谱式。', '协助会馆敦宗睦族，传承根文化，凝聚团结族人以纾解社会分化的现象；协助家庭凝聚团结，整合家族与姓族，发挥同舟共济，守望相助的精神；共同面对“全球化”新社会生活的严峻挑战。', '并推广现代通俗、易懂、易查的“新加坡模式”相册家谱谱法，让族谱真正发挥“存史、教化与资治”的功效。'] },
    en: { title: "The Society's mission is:", deck: '', paragraphs: ['To encourage members of the Chinese community to establish an identity as Singaporean Chinese, and to build and revise a Singapore genealogy as Singaporeans.', 'To help clan associations honour ancestors and strengthen kinship, carry forward root culture, and unite members to ease social division; to help families unite, integrate families and surname groups, uphold the spirit of mutual support and mutual watchfulness, and face together the severe challenges of a new social life under globalisation.', 'And to promote a modern, plain, easy-to-understand, and easy-to-search “Singapore model” method of photo genealogy, so that genealogies can truly serve the purposes of preserving history, educating, and informing governance.'] },
  },
  committee: {
    zh: { title: '执委会', deck: '一群把文化工作做得踏实的人。', paragraphs: ['学会以公开、清楚、可持续的方式推进会务。个人电话与住址不在网站公开；联络请统一通过秘书长。'] },
    en: { title: 'Committee', deck: 'A practical team for cultural work.', paragraphs: ['The Society works in a public, clear, and sustainable way. Personal phone numbers and home addresses are not published; please contact the Secretary for enquiries.'] },
  },
  method: {
    zh: { title: '新加坡相册家谱', deck: '八大招，把一个家庭的根与路排成可读的书。', paragraphs: ['相册家谱不是把资料堆在一起，而是从第一代在新加坡落地生根的人开始，按本地生活的时间与地点重新组织。'] },
    en: { title: 'Singapore Photo Genealogy', deck: 'Eight Methods for making a family’s roots and routes readable.', paragraphs: ['A Photo Genealogy is not a pile of records. It begins with the first generation to settle in Singapore and arranges a family’s life through local time and place.'] },
  },
  publications: {
    zh: { title: '出版', deck: '把口述、文献与家庭记忆，留成可以翻阅的东西。', paragraphs: ['学会的出版工作以文化记录为先。书名与出版资料以现有正式版本为准。', '页面同时整理相关文章与相册家谱样本，供读者下载阅读；资料的作者、来源与性质会在页面中说明。'] },
    en: { title: 'Publications', deck: 'Making oral history, documents, and family memory available to turn through.', paragraphs: ['The Society publishes with cultural record-keeping in mind. Titles and publication details follow the formal editions currently available.', 'This page also gathers related articles and Photo Genealogy samples for download; each item identifies its author, source or character where known.'] },
  },
  stories: {
    zh: { title: '家族故事', deck: '一家的故事，从愿意留下的那一句开始。', paragraphs: ['这里收录与新加坡生活、迁徙、方言、食物和家族记忆有关的资料故事。公开故事会在得到同意后刊出；私人资料不会自动成为公共内容。', '以下内容先以已提供的文章与照片为基础，读者可从每个故事继续阅读原始资料。'] },
    en: { title: 'Family stories', deck: 'A family story begins with the sentence someone chooses to keep.', paragraphs: ['This section gathers source-based stories of Singapore life, migration, dialect, food, and family memory. Public stories are published with consent; private material does not become public by default.', 'The first entries are based on the articles and photographs provided to the Society; each story links back to its source material.'] },
  },
  events: {
    zh: { title: '活动', deck: '从一次聚会、一场分享，继续认识我们的根。', paragraphs: ['以下先整理现有资料中的历史记录、出版资料与现场照片。正式活动日期、地点和报名安排，会在确认后发布。'] },
    en: { title: 'Events', deck: 'Meet our roots through gatherings and conversations.', paragraphs: ['This page first gathers historical records, publication materials and available event photographs. Confirmed dates, venues and registration details will be published when available.'] },
  },
  membership: {
    zh: { title: '入会', deck: '把一家的故事，认真保存下来。', paragraphs: ['年费 S$99，含一年谱坊账号一个。交费后由学会开通会员号，并通过邮件或者 WhatsApp 通知您。网站不收款；年费不含印刷成书。'] },
    en: { title: 'Membership', deck: 'Give a family story a place to be kept with care.', paragraphs: ['S$99 a year includes one studio account for one family book. After payment, the Society issues a member ID and notifies you by email or WhatsApp. No payment is taken on this website; printing is not included.'] },
  },
  privacy: {
    zh: { title: '隐私', deck: '少收集，清楚说明，尊重家庭资料的边界。', paragraphs: ['学会是本网站的资料主体。网站公共页不收集 NRIC；你通过电邮或 WhatsApp 主动提供的姓名、电话号码与电邮，只用于回复询问、处理入会沟通及提供学会服务。', '学会不会把联络资料出售、出租或提供给无关第三方。若资料需要交由服务供应商处理，学会会要求其只按指定目的使用，并采取合理的保密与安全措施。', '未来谱坊功能若上线，家谱与上传文件默认私密，仅供会员及获授权者使用；电话与地址不会出现在公共页面。你可以通过公开联络方式要求查阅、更正或询问个人资料的使用情况。', '本站遵守新加坡《个人资料保护法令》(PDPA)。'] },
    en: { title: 'Privacy', deck: 'Collect less, explain clearly, and respect the boundary around family records.', paragraphs: ['The Society is the data controller for this website. Public pages do not collect NRIC. Names, phone numbers and email addresses that you voluntarily send by email or WhatsApp are used only to answer enquiries, handle membership communications and provide Society services.', 'The Society does not sell, rent or provide contact details to unrelated third parties. Where a service provider processes information, the Society requires it to use the information only for the stated purpose and to apply reasonable confidentiality and security measures.', 'If the future members’ studio is launched, genealogy books and uploaded files will be private by default and available only to members and authorised people. Phone numbers and addresses will not appear on public pages. You may ask to access or correct your personal information through the public contact channel.', 'This website complies with Singapore’s Personal Data Protection Act (PDPA).'] },
  },
  terms: {
    zh: { title: '使用条款', deck: '这里是学会的公共文化网站。', paragraphs: ['本网站提供一般文化、出版与寻根参考。学会会尽力保持资料准确，但不保证每一项内容、外部链接或活动安排持续不变。', '外部网站由各自机构管理，学会不代表这些机构，也不代替其资料检索、申请、预约或研究服务。访问外部网站时，请遵守对方的使用条款与隐私政策。', '网站文字、图像、书目资料与学会标识属于学会或相应权利人。未经许可，不得复制、改编、商业使用或冒充学会发布内容；合理引用时应注明来源。', '入会、会员号、年费与未来谱坊服务以学会另行说明为准。本网站不收款，任何付款安排应通过学会公开联络方式确认。', '如对网站内容、资料使用或版权有疑问，请通过公开联络方式联系学会。'] },
    en: { title: 'Terms', deck: 'This is the Society’s public cultural website.', paragraphs: ['This website provides general cultural, publication and family-history reference. The Society takes care to keep information accurate, but does not guarantee that every item, external link or event arrangement will remain unchanged.', 'External websites are managed by their respective institutions. The Society does not represent them or replace their research, application, booking or reference services. When visiting an external website, follow its terms of use and privacy policy.', 'Website text, images, publication information and Society marks belong to the Society or the relevant rights holders. Do not copy, adapt, use commercially or present Society material as your own without permission; reasonable quotation should acknowledge the source.', 'Membership, member IDs, fees and any future studio service are subject to separate Society information. This website does not take payments; confirm any payment arrangement through the Society’s public contact channel.', 'For questions about website content, use of information or copyright, contact the Society through the public contact channel.'] },
  },
  contact: {
    zh: { title: '联络', deck: '想入会、分享故事，或了解学会工作，欢迎写信。', paragraphs: ['公开联络只有秘书长。入会请先通过 WhatsApp 联系；学会收到线下付款后才会开通会员号。'] },
    en: { title: 'Contact', deck: 'For membership, stories, or questions about the Society, write to us.', paragraphs: ['The Secretary is the Society’s public contact. Please use WhatsApp for membership enquiries; a member ID is issued only after offline payment is received by the Society.'] },
  },
};

export const resources = [
  { label: 'Roots.sg heritage portal', zh: '新加坡文化遗产资料库', zhDescription: '查阅新加坡国家收藏、历史地点、文化故事与遗产资源。', enDescription: 'Explore Singapore’s national collection, historic places, stories and heritage resources.', href: 'https://www.roots.gov.sg/' },
  { label: 'National Archives of Singapore', zh: '国家档案馆', zhDescription: '寻找政府档案、历史文件、照片与视听资料。', enDescription: 'Search government records, historical documents, photographs and audiovisual materials.', href: 'https://www.nas.gov.sg/' },
  { label: 'National Library Board', zh: '国家图书馆', zhDescription: '从书籍、报刊与数码馆藏继续查找家族线索。', enDescription: 'Continue the search through books, newspapers and digital collections.', href: 'https://www.nlb.gov.sg/' },
  { label: 'Singapore Chinese Cultural Centre', zh: '华族文化中心', zhDescription: '认识新加坡华族文化、社群记忆与公共活动。', enDescription: 'Encounter Singapore Chinese culture, community memory and public programmes.', href: 'https://www.singaporeccc.org.sg/' },
  { label: 'SFCCA', zh: '宗乡总会', zhDescription: '了解宗乡会馆网络与新加坡华社的公共联系。', enDescription: 'Learn about the clan association network and Singapore Chinese community links.', href: 'https://sfcca.sg/' },
  { label: 'National Heritage Board', zh: '国家文物局', zhDescription: '了解新加坡国家遗产政策、博物馆与文化机构。', enDescription: 'Learn about Singapore’s heritage policy, museums and cultural institutions.', href: 'https://www.nhb.gov.sg/' },
];

export const pathFor = (lang: Lang, key: PageKey) => `${lang === 'en' ? '/en' : ''}/${key}`;
