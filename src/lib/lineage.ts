import type { StudioPerson } from './studio';

export type LineageBranch = {
  id: string;
  members: StudioPerson[];
  parents: StudioPerson[];
  children: StudioPerson[];
};

export type LineageGeneration = {
  generation: number;
  members: StudioPerson[];
  branches: LineageBranch[];
};

export type LineageGridPlacement = { start: number; span: number };

export function buildLineageGrid(generations: LineageGeneration[]) {
  const childrenByParent = new Map<string, LineageBranch[]>();
  generations.forEach((generation, generationIndex) => {
    if (generationIndex === 0) return;
    generation.branches.forEach((branch) => {
      const parentId = parentBranchIds(generations, generationIndex, branch)[0];
      if (!parentId) return;
      const children = childrenByParent.get(parentId) ?? [];
      children.push(branch);
      childrenByParent.set(parentId, children);
    });
  });

  const widths = new Map<string, number>();
  const branchWidth = (branch: LineageBranch): number => {
    const cached = widths.get(branch.id);
    if (cached) return cached;
    const children = childrenByParent.get(branch.id) ?? [];
    const width = children.length ? children.reduce((sum, child) => sum + branchWidth(child), 0) : 1;
    widths.set(branch.id, width);
    return width;
  };

  const placements = new Map<string, LineageGridPlacement>();
  const placeBranch = (branch: LineageBranch, start: number) => {
    const span = branchWidth(branch);
    placements.set(branch.id, { start, span });
    let childStart = start;
    (childrenByParent.get(branch.id) ?? []).forEach((child) => {
      placeBranch(child, childStart);
      childStart += branchWidth(child);
    });
  };

  let nextColumn = 1;
  (generations[0]?.branches ?? []).forEach((branch) => {
    placeBranch(branch, nextColumn);
    nextColumn += branchWidth(branch);
  });
  generations.flatMap((generation) => generation.branches).forEach((branch) => {
    if (placements.has(branch.id)) return;
    placeBranch(branch, nextColumn);
    nextColumn += branchWidth(branch);
  });

  return { columns: Math.max(1, nextColumn - 1), placements };
}

export const genealogyMarkerLabels: Record<string, { symbol: string; label: string }> = {
  compiler: { symbol: '本', label: '立谱者' },
  distinguished: { symbol: '＊', label: '卓越表现者' },
  unreachable: { symbol: '△', label: '联系不上' },
  no_descendants: { symbol: '止', label: '无子嗣' },
  died_young: { symbol: '夭', label: '夭折' },
  continuing: { symbol: '│', label: '传承中' },
};

export function lifeStatusLabel(value: string | null) {
  return value === 'living' ? '在世' : value === 'deceased' ? '已故' : '状态未注明';
}

function genealogyDate(value: string | null | undefined, year: number | null) {
  if (value) {
    const parts = value.split('-').map((part) => Number(part));
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) return parts.join('.');
    return value;
  }
  return year ? String(year) : '';
}

export function personLifespan(person: StudioPerson) {
  const birth = genealogyDate(person.birth_date, person.birth_year);
  const death = genealogyDate(person.death_date, null);
  if (!birth && !death) return person.life_status === 'deceased' ? '生卒未详' : '';
  if (death) return `${birth || '生年未详'} — ${death}`;
  if (person.life_status === 'deceased') return `${birth || '生年未详'} — 卒年未详`;
  return `${birth || '生年未详'} —`;
}

export function personDisplayName(person: StudioPerson) {
  const lifespan = personLifespan(person);
  return lifespan ? `${person.name}（${lifespan}）` : person.name;
}

export function personSexLabel(person: StudioPerson) {
  return person.sex === 'male' ? '男' : person.sex === 'female' ? '女' : '性别未注明';
}

export function personMarkerSymbols(person: StudioPerson) {
  return (person.genealogy_markers ?? []).map((marker) => genealogyMarkerLabels[marker]?.symbol).filter(Boolean).join('');
}

export function personResidenceCode(person: StudioPerson) {
  return person.life_status === 'deceased' ? '' : person.residence_code ?? '';
}

export function siblingsOf(person: StudioPerson, people: StudioPerson[]) {
  if (!person.father_id && !person.mother_id) return [];
  return people.filter((candidate) => candidate.id !== person.id && (
    (person.father_id && candidate.father_id === person.father_id)
    || (person.mother_id && candidate.mother_id === person.mother_id)
  ));
}

export function branchChildSummary(branch: LineageBranch) {
  if (branch.children.length) return branch.children.map((person) => `${person.name}（${personSexLabel(person)}）`).join('、');
  const markers = new Set(branch.members.flatMap((person) => person.genealogy_markers ?? []));
  if (markers.has('died_young')) return '夭折，未续支';
  if (markers.has('no_descendants')) return '无子嗣';
  return '未填写';
}

export function buildLineageGenerations(people: StudioPerson[]): LineageGeneration[] {
  const generations = [...new Set(people.map((person) => person.generation_number))].sort((a, b) => a - b);
  const records = generations.map((generation) => {
    const members = people
      .filter((person) => person.generation_number === generation)
      .sort((a, b) => a.name.localeCompare(b.name));
    const grouped = new Map<string, StudioPerson[]>();

    members.forEach((person) => {
      const spouse = people.find((item) => item.id === person.spouse_id);
      const key = spouse ? [person.id, spouse.id].sort().join(':') : person.id;
      const branch = grouped.get(key) ?? [];
      if (!branch.some((item) => item.id === person.id)) branch.push(person);
      if (spouse && !branch.some((item) => item.id === spouse.id)) branch.push(spouse);
      grouped.set(key, branch);
    });

    return {
      generation,
      members,
      branches: [...grouped.values()].map((branch) => {
        const parents = [...new Map(
          branch
            .flatMap((person) => [person.father_id, person.mother_id])
            .filter((id): id is string => Boolean(id))
            .map((id) => [id, people.find((person) => person.id === id)])
            .filter((entry): entry is [string, StudioPerson] => Boolean(entry[1])),
        ).values()];
        const children = people.filter((person) => branch.some((parent) => person.father_id === parent.id || person.mother_id === parent.id));
        const id = branch.map((person) => person.id).sort().join(':');
        return { id, members: branch, parents, children };
      }),
    };
  });

  records.forEach((record, index) => {
    if (index === 0) return;
    const previous = records[index - 1].branches;
    record.branches.sort((a, b) => {
      const aParentIds = new Set(a.parents.map((parent) => parent.id));
      const bParentIds = new Set(b.parents.map((parent) => parent.id));
      const aParentIndex = previous.findIndex((parentBranch) => parentBranch.members.some((member) => aParentIds.has(member.id)));
      const bParentIndex = previous.findIndex((parentBranch) => parentBranch.members.some((member) => bParentIds.has(member.id)));
      return (aParentIndex < 0 ? Number.MAX_SAFE_INTEGER : aParentIndex) - (bParentIndex < 0 ? Number.MAX_SAFE_INTEGER : bParentIndex);
    });
  });

  return records;
}

export function orderedFamilyMembers(members: StudioPerson[]) {
  const rank = (person: StudioPerson) => person.sex === 'male' ? 0 : person.sex === 'female' ? 1 : 2;
  return [...members].sort((a, b) => rank(a) - rank(b));
}

export function parentBranchIds(generations: LineageGeneration[], generationIndex: number, branch: LineageBranch) {
  if (generationIndex === 0) return [];
  const previous = generations[generationIndex - 1];
  const parentIds = new Set(branch.parents.map((parent) => parent.id));
  return previous.branches
    .filter((parentBranch) => parentBranch.members.some((member) => parentIds.has(member.id)))
    .map((parentBranch) => parentBranch.id);
}

export function lineageLegendMarkup() {
  return `<div class="lineage-tree-legend" aria-label="世系标注说明">
    <section class="lineage-legend-group">
      <strong>注明</strong>
      <div class="lineage-legend-items">
        <span><b>本</b>立谱者</span>
        <span><b>＊</b>卓越表现者</span>
        <span><b>△</b>联系不上</span>
        <span><b>止</b>无子嗣</span>
        <span><b>夭</b>夭折</span>
        <span><b>│</b>传承中</span>
      </div>
    </section>
    <section class="lineage-legend-group">
      <strong>居住地缩写</strong>
      <p>名字左上方英文字母，代表现在居住地。</p>
      <div class="lineage-legend-items lineage-residence-codes">
        <span><b>S</b>新加坡</span>
        <span><b>M</b>马来西亚</span>
        <span><b>HK</b>香港</span>
        <span><b>UK</b>英国</span>
        <span><b>US</b>美国</span>
        <span><b>空白</b>已故世者</span>
      </div>
      <p class="lineage-legend-note">再移民：注明年代、地区；未记录者标为「失记」。</p>
    </section>
  </div>`;
}

export function familyBranchLabel(branch: LineageBranch) {
  if (branch.members.length > 1) return orderedFamilyMembers(branch.members).map((person) => person.name).join('、');
  return branch.members[0]?.name ?? '未命名支系';
}
