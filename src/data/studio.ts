export type StudioStep = { method: number; slug: string; title: string; english: string; guidance: string; type: 'cover' | 'notes' | 'people' | 'register' };

export const studioSteps: StudioStep[] = [
  { method: 1, slug: '1-cover', title: '封面', english: 'Cover', guidance: '先定下这本相册家谱的名字与开族始祖。两项完成后，再继续写其他章节。', type: 'cover' },
  { method: 2, slug: '2-surname', title: '姓氏渊源', english: 'Surname origin', guidance: '从姓氏、祖籍或家中流传的线索开始。没有文献也可以先写家人知道的事。', type: 'notes' },
  { method: 3, slug: '3-migration', title: '祖辈迁徙', english: 'Migration', guidance: '按地点和年代，留下南来、落地、生根的路。可以一条一条慢慢补。', type: 'notes' },
  { method: 4, slug: '4-culture', title: '籍贯文化', english: 'Ancestral culture', guidance: '记录方言、堂号、祖屋、庙宇、会馆与家中习惯。', type: 'notes' },
  { method: 5, slug: '5-lineage', title: '世系', english: 'Lineage', guidance: '先加最确定的人。第一代是最早在新加坡落地生根的祖先；电话与地址不在此页记录。', type: 'people' },
  { method: 6, slug: '6-childhood', title: '童年', english: 'Childhood', guidance: '记下在新加坡成长的年代、地点和一两件真实的小事。', type: 'notes' },
  { method: 7, slug: '7-dishes', title: '家肴', english: 'Family dishes', guidance: '一道菜也能带出一段家族记忆：写下名字、材料、做法或是谁教会你的。', type: 'notes' },
  { method: 8, slug: '8-register', title: '族人资料', english: 'Family register', guidance: '在世系基础上补充职业、教育；电话与地址仅你本人和学会资料管理员可见。', type: 'register' },
];

export const studioStepBySlug = new Map(studioSteps.map((step) => [step.slug, step]));
