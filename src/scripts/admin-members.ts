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
  pdf_download_enabled: boolean;
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

async function callAdmin<T>(action: 'create' | 'reset-password' | 'list' | 'update-membership' | 'prepare-download' | 'next_member_no' | 'list-payments' | 'record-payment', values: Record<string, string> = {}) {
  if (!isStudioConfigured) throw new Error(studioUnavailableMessage());
  const client = getSupabase();
  const { data, error } = await client!.functions.invoke('admin-members', { body: { action, ...values } });
  if (error) {
    const response = (error as { context?: Response }).context;
    if (response instanceof Response) {
      const failure = await response.json().catch(() => null);
      if (failure?.error) throw new Error(failure.error);
    }
    throw new Error('无法连接会员管理服务。');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

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
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = (Date.parse(date) - start) / 86400000;
  return days >= 0 && days <= 30;
}

function isOverdue(date: string) {
  const today = new Date();
  const end = new Date(`${date}T00:00:00`);
  today.setHours(0, 0, 0, 0);
  return end < today;
}

async function suggestMemberNo() {
  const result = await callAdmin<{ memberId: string }>('next_member_no');
  const input = document.querySelector<HTMLInputElement>('[data-admin-create-form] input[name="memberId"]');
  if (input && !input.value) input.value = result.memberId;
}

let memberRecords: MemberRecord[] = [];

function renderRoster(members: MemberRecord[]) {
  if (!roster) return;
  roster.replaceChildren();
  const query = document.querySelector<HTMLInputElement>('[data-admin-search]')?.value.trim().toLowerCase() ?? '';
  const statusFilter = document.querySelector<HTMLSelectElement>('[data-admin-status-filter]')?.value ?? 'all';
  const expiryFilter = document.querySelector<HTMLSelectElement>('[data-admin-expiring]')?.value ?? 'all';
  const counts = document.querySelector<HTMLElement>('[data-admin-renewal-counts]');
  if (counts) counts.textContent = `30 日内到期：${members.filter((member) => withinThirtyDays(member.ends_on)).length} 位；已过期：${members.filter((member) => isOverdue(member.ends_on)).length} 位。`;
  const filtered = members.filter((member) => {
    const matchesQuery = !query || `${member.member_id} ${member.display_name}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesExpiry = expiryFilter === 'all' || (expiryFilter === 'soon' ? withinThirtyDays(member.ends_on) : isOverdue(member.ends_on));
    return matchesQuery && matchesStatus && matchesExpiry;
  });
  if (!filtered.length) {
    const row = document.createElement('tr');
    const item = cell(!members.length ? '尚未开通会员。' : expiryFilter === 'soon' ? '没有 30 日内到期的会员。' : expiryFilter === 'overdue' ? '没有已过期的会员。' : '没有符合筛选条件的会员。');
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
    management.innerHTML = `<form class="admin-member-update" data-admin-update="${escapeAttribute(member.member_id)}"><select name="status" aria-label="${escapeAttribute(member.member_id)} 状态"><option value="active"${member.status === 'active' ? ' selected' : ''}>有效</option><option value="suspended"${member.status === 'suspended' ? ' selected' : ''}>暂停</option><option value="expired"${member.status === 'expired' ? ' selected' : ''}>届满</option></select><label>结束日<input name="endsOn" type="date" value="${escapeAttribute(member.ends_on)}" required /></label><label class="admin-member-download"><span>MEMBER DOWNLOAD / 会员下载</span><span class="admin-switch"><input name="pdfDownloadEnabled" type="checkbox" value="true"${member.pdf_download_enabled ? ' checked' : ''} /><span aria-hidden="true"></span><strong>允许会员下载 PDF</strong></span></label><button class="text-link" type="submit">保存</button></form>`;
    const payments = document.createElement('details');
    payments.innerHTML = `<summary>录入缴费</summary><form class="studio-admin-form" data-admin-payment="${escapeAttribute(member.member_id)}"><div class="studio-fields">
      <label>金额（SGD）<input name="amount" type="number" value="99.00" min="0.01" max="99999999.99" step="0.01" required /></label>
      <label>缴费方式<input name="method" value="PayNow" required /></label>
      <label>PayNow 参考号<input name="paynowReference" /></label>
      <label>缴费日期<input name="paidOn" type="date" value="${new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}" required /></label>
      <label>会籍开始日<input name="membershipStart" type="date" /></label>
      <label>会籍结束日<input name="membershipEnd" type="date" /></label>
      <label>备注<textarea name="notes" rows="2"></textarea></label></div>
      <label><input name="extendMembership" type="checkbox" value="true" /> 同时延长会籍结束日</label>
      <button class="text-link" type="submit">保存缴费</button></form>`;
    const history = document.createElement('details');
    history.innerHTML = '<summary>缴费记录</summary><div aria-live="polite">展开以读取缴费记录。</div>';
    history.addEventListener('toggle', () => {
      if (history.open) void loadPayments(member.member_id, history.querySelector('div')!);
    });
    management.append(payments, history);
    row.append(person, contact, dates, memberStatus, management);
    roster.append(row);
  });
}

type Payment = {
  amount: number; currency: string; method: string; paynow_reference: string | null;
  paid_on: string; membership_start: string | null; membership_end: string | null; notes: string | null;
};

async function loadPayments(memberId: string, container: HTMLElement) {
  container.textContent = '正在读取缴费记录…';
  try {
    const { payments } = await callAdmin<{ payments: Payment[] }>('list-payments', { memberId });
    container.replaceChildren();
    if (!payments.length) { container.textContent = '尚无缴费记录。'; return; }
    const list = document.createElement('ul');
    payments.forEach((payment) => {
      const item = document.createElement('li');
      item.textContent = `${payment.paid_on} · ${payment.currency} ${Number(payment.amount).toFixed(2)} · ${payment.method}；PayNow 参考号：${payment.paynow_reference || '未填写'}；会籍：${payment.membership_start || '未填写'} 至 ${payment.membership_end || '未填写'}；备注：${payment.notes || '无'}`;
      list.append(item);
    });
    container.append(list);
  } catch (error) {
    container.textContent = error instanceof Error ? error.message : '无法读取缴费记录。';
  }
}

roster?.addEventListener('submit', async (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || !form.dataset.adminPayment) return;
  event.preventDefault();
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const values = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
  values.memberId = form.dataset.adminPayment;
  try {
    if (button) button.disabled = true;
    await callAdmin('record-payment', values);
    await loadRoster();
    report(`${values.memberId} 的缴费已记录。`);
  } catch (error) {
    report(error instanceof Error ? error.message : '无法录入缴费。');
  } finally {
    if (button) button.disabled = false;
  }
});

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
  values.pdfDownloadEnabled = form.querySelector<HTMLInputElement>('input[name="pdfDownloadEnabled"]')?.checked ? 'true' : 'false';
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
    await suggestMemberNo();
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
    await suggestMemberNo();
  } catch (error) {
    report(error instanceof Error ? error.message : studioUnavailableMessage());
  }
})();
