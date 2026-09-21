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

export function lifeStatusLabel(value: string | null) {
  return value === 'living' ? '在世' : value === 'deceased' ? '已故' : '状态未注明';
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
      const aParentIndex = previous.findIndex((parentBranch) => a.parents.some((parent) => parentBranch.children.some((child) => child.id === parent.id)));
      const bParentIndex = previous.findIndex((parentBranch) => b.parents.some((parent) => parentBranch.children.some((child) => child.id === parent.id)));
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
  return previous.branches
    .filter((parentBranch) => branch.parents.some((parent) => parentBranch.children.some((child) => child.id === parent.id)))
    .map((parentBranch) => parentBranch.id);
}

export function familyBranchLabel(branch: LineageBranch) {
  if (branch.members.length > 1) return orderedFamilyMembers(branch.members).map((person) => person.name).join('、');
  return branch.members[0]?.name ?? '未命名支系';
}
