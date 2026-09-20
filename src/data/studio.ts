export type StudioStep = { method: number; slug: string; title: string; english: string; guidance: string; type: 'cover' | 'notes' | 'people' | 'register' };
export type StudioMediaProfile = {
  key: 'cover' | 'context' | 'migration' | 'lineage' | 'childhood' | 'dish' | 'register';
  frame: 'portrait' | 'landscape' | 'document' | 'free';
  displayMaxEdge: number;
  thumbMaxEdge: number;
  displayTargetBytes: number;
  thumbTargetBytes: number;
  guidance: string;
};

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

const studioMediaProfiles: Record<number, StudioMediaProfile> = {
  1: { key: 'cover', frame: 'portrait', displayMaxEdge: 2000, thumbMaxEdge: 720, displayTargetBytes: 1.8 * 1024 * 1024, thumbTargetBytes: 420 * 1024, guidance: '封面优先保留完整画面；可用家庭合照、地点或物件，不会强行裁切。' },
  2: { key: 'context', frame: 'landscape', displayMaxEdge: 2000, thumbMaxEdge: 720, displayTargetBytes: 1.8 * 1024 * 1024, thumbTargetBytes: 420 * 1024, guidance: '祖籍、姓氏和旧谱资料可横可竖，边缘与文字完整保留。' },
  3: { key: 'migration', frame: 'landscape', displayMaxEdge: 2200, thumbMaxEdge: 760, displayTargetBytes: 2 * 1024 * 1024, thumbTargetBytes: 450 * 1024, guidance: '迁徙地图、旧居和路线适合横向阅读，系统不会裁掉两侧内容。' },
  4: { key: 'context', frame: 'landscape', displayMaxEdge: 2000, thumbMaxEdge: 720, displayTargetBytes: 1.8 * 1024 * 1024, thumbTargetBytes: 420 * 1024, guidance: '会馆、庙宇、祖屋和文化物件按完整画面保存。' },
  5: { key: 'lineage', frame: 'landscape', displayMaxEdge: 2400, thumbMaxEdge: 900, displayTargetBytes: 2.4 * 1024 * 1024, thumbTargetBytes: 520 * 1024, guidance: '世系图和家族合照保留较高分辨率，方便阅读人物与关系。' },
  6: { key: 'childhood', frame: 'landscape', displayMaxEdge: 2000, thumbMaxEdge: 720, displayTargetBytes: 1.8 * 1024 * 1024, thumbTargetBytes: 420 * 1024, guidance: '童年照片保持原有比例，不裁掉人物、日期或相片边缘。' },
  7: { key: 'dish', frame: 'landscape', displayMaxEdge: 1800, thumbMaxEdge: 680, displayTargetBytes: 1.6 * 1024 * 1024, thumbTargetBytes: 380 * 1024, guidance: '家肴照片和手稿可横可竖，完整保留菜品与文字说明。' },
  8: { key: 'register', frame: 'document', displayMaxEdge: 2400, thumbMaxEdge: 900, displayTargetBytes: 2.4 * 1024 * 1024, thumbTargetBytes: 520 * 1024, guidance: '族人资料和文档按可读性保存，尽量保留整页，不裁切证件或文字。' },
};

export function getStudioMediaProfile(method: number): StudioMediaProfile {
  return studioMediaProfiles[method] ?? studioMediaProfiles[2];
}
