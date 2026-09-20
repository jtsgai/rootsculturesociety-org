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
  closed_at?: string | null;
  purge_after?: string | null;
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

async function callAdmin<T>(action: 'create' | 'reset-password' | 'list' | 'update-membership' | 'prepare-download' | 'get-settings' | 'update-settings', values: Record<string, string> = {}) {
  if (!isStudioConfigured) throw new Error(studioUnavailableMessage());
  const client = getSupabase();
  const { data, error } = await client!.functions.invoke('admin-members', { body: { action, ...values } });
  if (error) throw new Error('无法连接会员管理服务。');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

const pdfDownloadSetting = document.querySelector<HTMLInputElement>('[data-admin-pdf-download-setting]');
const pdfDownloadSettingStatus = document.querySelector<HTMLElement>('[data-admin-pdf-download-setting-status]');

async function loadPdfDownloadSetting() {
  try {
    const result = await callAdmin<{ memberPdfDownloadEnabled: boolean }>('get-settings');
    if (pdfDownloadSetting) pdfDownloadSetting.checked = result.memberPdfDownloadEnabled;
  } catch (error) {
    if (pdfDownloadSettingStatus) pdfDownloadSettingStatus.textContent = error instanceof Error ? error.message : '无法读取 PDF 下载开关。';
  }
}

pdfDownloadSetting?.addEventListener('change', async () => {
  if (!pdfDownloadSetting) return;
  pdfDownloadSetting.disabled = true;
  try {
    const result = await callAdmin<{ memberPdfDownloadEnabled: boolean }>('update-settings', { memberPdfDownloadEnabled: String(pdfDownloadSetting.checked) });
    pdfDownloadSetting.checked = result.memberPdfDownloadEnabled;
    if (pdfDownloadSettingStatus) pdfDownloadSettingStatus.textContent = result.memberPdfDownloadEnabled ? '已开启：有效会员可在私密预览下载 PDF。' : '已关闭：会员端不显示 PDF 下载入口。';
  } catch (error) {
    pdfDownloadSetting.checked = !pdfDownloadSetting.checked;
    if (pdfDownloadSettingStatus) pdfDownloadSettingStatus.textContent = error instanceof Error ? error.message : '无法保存 PDF 下载开关。';
  } finally {
    pdfDownloadSetting.disabled = false;
  }
});

void loadPdfDownloadSetting();

document.querySelector<HTMLFormElement>('[data-admin-export-form]')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const resultBox = document.querySelector<HTMLElement>('[data-admin-export-results]');
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  try {
    if (resultBox) resultBox.textContent = '正在生成 5 分钟有效的私有链接…';
    const result = await callAdmin<{ member: { memberId: string; displayName: string }; book: { title: string | null }; files: Array<{ method: number; caption: string | null; signedUrl: string }>; expiresInSeconds: number }>('prepare-download', values);
    if (!resultBox) return;
    resultBox.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${result.member.memberId} · ${result.book.title || '未命名相册家谱'}`;
    resultBox.append(heading);
    if (!result.files.length) {
      resultBox.append(document.createTextNode('目前没有已上传的照片原件。'));
      return;
    }
    const list = document.createElement('ul');
    result.files.forEach((file, index) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = file.signedUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = `第 ${file.method} 章照片 ${index + 1}${file.caption ? ` · ${file.caption}` : ''} ↗`;
      item.append(link);
      list.append(item);
    });
    resultBox.append(list, document.createTextNode(`链接将在 ${Math.round(result.expiresInSeconds / 60)} 分钟后失效。`));
    report('临时下载链接已生成；请只用于这次印书工作。');
  } catch (error) {
    if (resultBox) resultBox.textContent = '';
    report(error instanceof Error ? error.message : '无法生成下载链接。');
  }
});

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

function escapeAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
}

function withinThirtyDays(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${date}T00:00:00`);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  return days >= 0 && days <= 30;
}

let memberRecords: MemberRecord[] = [];

function renderRoster(members: MemberRecord[]) {
  if (!roster) return;
  roster.replaceChildren();
  const query = document.querySelector<HTMLInputElement>('[data-admin-search]')?.value.trim().toLowerCase() ?? '';
  const statusFilter = document.querySelector<HTMLSelectElement>('[data-admin-status-filter]')?.value ?? 'all';
  const expiringOnly = document.querySelector<HTMLInputElement>('[data-admin-expiring]')?.checked ?? false;
  const filtered = members.filter((member) => {
    const matchesQuery = !query || `${member.member_id} ${member.display_name}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesExpiry = !expiringOnly || withinThirtyDays(member.ends_on);
    return matchesQuery && matchesStatus && matchesExpiry;
  });
  if (!filtered.length) {
    const row = document.createElement('tr');
    const item = cell(members.length ? '没有符合筛选条件的会员。' : '尚未开通会员。');
    item.colSpan = 5;
    row.append(item);
    roster.append(row);
    return;
  }
  filtered.forEach((member) => {
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
    const management = document.createElement('td');
    management.innerHTML = `<form class="admin-member-update" data-admin-update="${escapeAttribute(member.member_id)}"><select name="status" aria-label="${escapeAttribute(member.member_id)} 状态"><option value="active"${member.status === 'active' ? ' selected' : ''}>有效</option><option value="suspended"${member.status === 'suspended' ? ' selected' : ''}>暂停</option><option value="expired"${member.status === 'expired' ? ' selected' : ''}>届满</option></select><label>结束日<input name="endsOn" type="date" value="${escapeAttribute(member.ends_on)}" required /></label><button class="text-link" type="submit">保存</button></form>`;
    row.append(person, contact, dates, memberStatus, management);
    roster.append(row);
  });
}

async function loadRoster(shouldReport = false) {
  const result = await callAdmin<{ members: MemberRecord[] }>('list');
  memberRecords = result.members ?? [];
  renderRoster(memberRecords);
  if (shouldReport) report('会员名册已更新。');
}

document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-admin-search], [data-admin-status-filter], [data-admin-expiring]').forEach((control) => {
  control.addEventListener('input', () => renderRoster(memberRecords));
  control.addEventListener('change', () => renderRoster(memberRecords));
});

roster?.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.adminUpdate) return;
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  values.memberId = form.dataset.adminUpdate;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = '保存中…';
    }
    await callAdmin('update-membership', values);
    await loadRoster();
    report(`${values.memberId} 的会籍资料已更新。`);
  } catch (error) {
    report(error instanceof Error ? error.message : '无法更新会籍资料。');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = '保存';
    }
  }
});

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
