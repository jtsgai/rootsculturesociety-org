import { grantAiCreditsByMemberId, type AiCreditKind } from '../lib/admin';
import { getSupabase, isStudioConfigured } from '../lib/supabase';
import { currentProfile, requestAdminPasswordReset, signOut, studioUnavailableMessage } from '../lib/studio';

const status = document.querySelector<HTMLElement>('[data-studio-status]');
const once = document.querySelector<HTMLElement>('[data-admin-password]');
const memberOutput = document.querySelector<HTMLElement>('[data-admin-member-id]');
const passwordOutput = document.querySelector<HTMLElement>('[data-admin-initial-password]');
const roster = document.querySelector<HTMLTableSectionElement>('[data-admin-member-list]');
const createSuccess = document.querySelector<HTMLElement>('[data-admin-create-success]');
const createdMember = document.querySelector<HTMLElement>('[data-admin-created-member]');

type MemberRecord = {
  member_id: string;
  display_name: string;
  contact_email: string;
  contact_phone: string;
  starts_on: string;
  ends_on: string;
  status: 'active' | 'suspended' | 'expired';
};

function report(message: string) {
  if (status) status.textContent = message;
}

function showPassword(result: { memberId: string; initialPassword: string }) {
  if (memberOutput) memberOutput.textContent = result.memberId;
  if (passwordOutput) passwordOutput.textContent = result.initialPassword;
  if (once) once.hidden = false;
}

function showCreateSuccess(memberId: string) {
  if (createdMember) createdMember.textContent = memberId;
  if (createSuccess) createSuccess.hidden = false;
}

async function callAdmin<T>(action: 'create' | 'reset-password' | 'list', values: Record<string, string> = {}) {
  if (!isStudioConfigured) throw new Error(studioUnavailableMessage());
  const client = getSupabase();
  const { data, error } = await client!.functions.invoke('admin-members', { body: { action, ...values } });
  if (error) throw new Error('无法连接会员管理服务。');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

function setDefaultDates() {
  const startsOn = document.querySelector<HTMLInputElement>('input[name="startsOn"]');
  const endsOn = document.querySelector<HTMLInputElement>('input[name="endsOn"]');
  if (!startsOn || !endsOn || startsOn.value || endsOn.value) return;
  const today = new Date();
  const oneYearOn = new Date(today);
  oneYearOn.setFullYear(today.getFullYear() + 1);
  const isoDate = (date: Date) => date.toISOString().slice(0, 10);
  startsOn.value = isoDate(today);
  endsOn.value = isoDate(oneYearOn);
}

function statusLabel(status: MemberRecord['status']) {
  return { active: '有效', suspended: '暂停', expired: '届满' }[status];
}

function cell(value: string, className?: string) {
  const item = document.createElement('td');
  if (className) item.className = className;
  item.textContent = value;
  return item;
}

function renderRoster(members: MemberRecord[]) {
  if (!roster) return;
  roster.replaceChildren();
  if (!members.length) {
    const row = document.createElement('tr');
    const item = cell('尚未开通会员。');
    item.colSpan = 4;
    row.append(item);
    roster.append(row);
    return;
  }
  members.forEach((member) => {
    const row = document.createElement('tr');
    const person = document.createElement('td');
    const name = document.createElement('strong');
    name.textContent = member.display_name;
    const id = document.createElement('small');
    id.textContent = member.member_id;
    person.append(name, id);
    const contact = document.createElement('td');
    const email = document.createElement('span');
    email.textContent = member.contact_email;
    const phone = document.createElement('span');
    phone.textContent = member.contact_phone;
    contact.append(email, phone);
    const dates = cell(`${member.starts_on} 至 ${member.ends_on}`);
    const memberStatus = cell(statusLabel(member.status), `admin-status is-${member.status}`);
    row.append(person, contact, dates, memberStatus);
    roster.append(row);
  });
}

async function loadRoster(shouldReport = false) {
  const result = await callAdmin<{ members: MemberRecord[] }>('list');
  renderRoster(result.members ?? []);
  if (shouldReport) report('会员名册已更新。');
}

document.querySelector<HTMLFormElement>('[data-admin-create-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = '正在开通会员…';
    }
    const result = await callAdmin<{ memberId: string; initialPassword: string }>('create', values);
    showPassword(result);
    showCreateSuccess(result.memberId);
    await loadRoster();
    form.reset();
    setDefaultDates();
    if (button) button.textContent = '已成功开通 ✓';
    report('会员已经开通。请在离开本页前安全交付这组一次性密码。');
  } catch (error) {
    if (button) button.textContent = '开通会员与初始密码';
    report(error instanceof Error ? error.message : '无法开通会员。');
  } finally {
    if (button) button.disabled = false;
  }
});

document.querySelector<HTMLButtonElement>('[data-admin-password-reset]')?.addEventListener('click', async () => {
  try {
    const client = getSupabase();
    const { data: { user } } = await client!.auth.getUser();
    if (!user?.email) throw new Error('找不到管理员电邮，请先重新登录。');
    report('正在寄出设置密码邮件…');
    await requestAdminPasswordReset(user.email);
    report('已寄出。请打开最新一封「Reset your password」邮件，链接会先显示设置管理员密码页面。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法寄出设置密码邮件。');
  }
});

document.querySelector<HTMLFormElement>('[data-admin-reset-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    const result = await callAdmin<{ memberId: string; initialPassword: string }>('reset-password', values);
    showPassword(result);
    report('密码已重设。请安全交付这组一次性密码。');
  } catch (error) {
    report(error instanceof Error ? error.message : '无法重设密码。');
  }
});

document.querySelector<HTMLButtonElement>('[data-admin-refresh]')?.addEventListener('click', async () => {
  try {
    await loadRoster(true);
  } catch (error) {
    report(error instanceof Error ? error.message : '无法读取会员名册。');
  }
});

document.querySelector<HTMLButtonElement>('[data-studio-signout]')?.addEventListener('click', async () => {
  await signOut();
  window.location.assign('/admin/login');
});

document.querySelector<HTMLFormElement>('[data-admin-credit-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    const balance = await grantAiCreditsByMemberId(
      values.memberId,
      Number(values.amount),
      values.kind as AiCreditKind,
      values.note
    );
    report(`额度已记录。该会员当前余额：${balance}。`);
    form.reset();
  } catch (error) {
    report(error instanceof Error ? error.message : '无法记录额度。');
  }
});

void (async () => {
  try {
    const profile = await currentProfile();
    if (!profile) return window.location.assign('/admin/login');
    if (profile.role !== 'admin') {
      await signOut();
      return window.location.assign('/admin/login');
    }
    const signout = document.querySelector<HTMLButtonElement>('[data-studio-signout]');
    if (signout) signout.hidden = false;
    setDefaultDates();
    await loadRoster();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
