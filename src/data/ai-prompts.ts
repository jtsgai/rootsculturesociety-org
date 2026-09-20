import type { AiFeature } from '../lib/ai';

export type AiPromptPreset = {
  id: string;
  feature: AiFeature;
  label: string;
  description: string;
  prompt: string;
  creditCost: number;
};

/** Member-facing choices. These are safe defaults, not provider-specific prompts. */
export const aiPromptPresets: AiPromptPreset[] = [
  {
    id: 'restore-old-photo',
    feature: 'restore',
    label: '修复老照片',
    description: '去除划痕、污点与折痕，提升清晰度，保留真实面貌。',
    prompt: '修复这张老照片：去除划痕、污点、折痕和明显噪点，适度提升清晰度；保留人物真实面貌、原有构图和历史质感，不添加人物，不改变身份特征。',
    creditCost: 2,
  },
  {
    id: 'colorize-black-and-white',
    feature: 'restore',
    label: '黑白照片自然上色',
    description: '补充克制、可信的色彩，不改变人物和背景结构。',
    prompt: '为这张黑白老照片自然上色：采用克制、符合时代的肤色、衣物和环境色；保留原有人物、姿态、背景和照片纹理，不添加或删除人物。',
    creditCost: 2,
  },
  {
    id: 'sharpen-photo',
    feature: 'restore',
    label: '提高清晰度',
    description: '改善轻微模糊与噪点，保留照片边缘。',
    prompt: '改善这张照片的轻微模糊、噪点和曝光问题，保持完整画面与原有边缘；不要重画人物，不要改变脸部特征，不要添加文字或水印。',
    creditCost: 2,
  },
  {
    id: 'paper-roots-cover',
    feature: 'cover',
    label: '纸与树根主题封面',
    description: '生成家谱封面氛围，不生成祖先肖像。',
    prompt: '为一本新加坡家庭相册家谱设计封面氛围：暖纸色、墨线、暗红树根、旧店屋、灯下手稿和可阅读的留白；不要真人面孔、祖先肖像、金面具、科幻元素或水印。',
    creditCost: 3,
  },
  {
    id: 'story-to-image-prompt',
    feature: 'prompt',
    label: '把家族故事整理成绘图提示词',
    description: '把会员输入的故事整理成安全、可编辑的图片提示词。',
    prompt: '根据会员提供的家族故事，整理一段适合生成纪实氛围图的提示词：突出地点、物件、年代感、纸张、灯光和迁徙线索；不要捏造人物身份，不要生成祖先肖像，不要把私人电话、地址或证件资料放入提示词。',
    creditCost: 1,
  },
  {
    id: 'research-starting-points',
    feature: 'research',
    label: '整理资料搜索方向',
    description: '把线索整理成可核查的资料搜索问题，不代替事实核验。',
    prompt: '根据会员提供的家族线索，整理 3 至 5 个可核查的资料搜索方向，并为每个方向说明可能的资料类型；明确区分已知事实、家人口述与待查假设，不补写未经证实的历史。',
    creditCost: 1,
  },
];

