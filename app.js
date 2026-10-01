const API = 'http://localhost:3001';
let mode = 'login';
let items = [];

const $ = (s) => document.querySelector(s);
const authView = $('#authView');
const dashboardView = $('#dashboardView');

function showToast(message, error = false) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast show${error ? ' error' : ''}`;
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function setAuthMode(next) {
  mode = next;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  const register = mode === 'register';
  $('#nameGroup').classList.toggle('hidden', !register);
  $('#name').required = register;
  $('#authLabel').textContent = register ? 'COMECE AGORA' : 'BEM-VINDO DE VOLTA';
  $('#authTitle').textContent = register ? 'Crie sua conta' : 'Entrar na sua conta';
  $('#authDescription').textContent = register ? 'Monte sua própria biblioteca de referências.' : 'Acesse sua curadoria e continue de onde parou.';
  $('#authButtonText').textContent = register ? 'Criar conta' : 'Entrar';
  $('#authMessage').textContent = '';
}

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => setAuthMode(tab.dataset.mode)));

async function request(path, options = {}) {
  const token = localStorage.getItem('curadoria_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Não foi possível completar a operação.');
  return data;
}

$('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#authMessage');
  message.textContent = 'Processando...';
  try {
    if (mode === 'register') {
      await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: $('#name').value.trim(), email: $('#email').value.trim(), password: $('#password').value })
      });
      setAuthMode('login');
      $('#email').value = '';
      $('#password').value = '';
      showToast('Conta criada. Agora é só entrar.');
    } else {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value })
      });
      localStorage.setItem('curadoria_token', data.accessToken);
      await openDashboard();
    }
  } catch (error) {
    message.textContent = error.message;
  }
});

async function openDashboard() {
  try {
    const user = await request('/users/me');
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    const name = user.name || 'Usuário';
    $('#userName').textContent = name;
    $('#heroName').textContent = name.split(' ')[0];
    $('#userEmail').textContent = user.email;
    $('#avatar').textContent = name.charAt(0).toUpperCase();
    await loadItems();
  } catch (error) {
    localStorage.removeItem('curadoria_token');
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  }
}

async function loadItems() {
  try {
    items = await request('/items');
    renderItems();
  } catch (error) {
    showToast(error.message, true);
  }
}

function renderItems() {
  const query = $('#searchInput').value.toLowerCase().trim();
  const filtered = items.filter(item => [item.title, item.url, item.notes, item.tags].join(' ').toLowerCase().includes(query));
  $('#itemCount').textContent = items.length;
  const list = $('#itemsList');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><strong>${items.length ? 'Nada encontrado' : 'Sua curadoria está vazia'}</strong>${items.length ? 'Tente outro termo de pesquisa.' : 'Adicione sua primeira referência para começar.'}</div>`;
    return;
  }
  list.innerHTML = filtered.map(item => {
    const tags = String(item.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    const link = item.url ? `<a href="${escapeAttr(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>` : escapeHtml(item.title);
    return `<article class="item-card"><div class="item-title">${link}</div>${item.url ? `<div class="item-url">${escapeHtml(item.url)}</div>` : ''}${item.notes ? `<div class="item-notes">${escapeHtml(item.notes)}</div>` : ''}${tags ? `<div class="tags">${tags}</div>` : ''}</article>`;
  }).join('');
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(value) { return escapeHtml(value); }

$('#itemForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = $('#itemMessage');
  message.textContent = 'Salvando...';
  try {
    await request('/items', {
      method: 'POST',
      body: JSON.stringify({
        title: $('#itemTitle').value.trim(),
        url: $('#itemUrl').value.trim(),
        notes: $('#itemNotes').value.trim(),
        tags: $('#itemTags').value.trim()
      })
    });
    event.target.reset();
    message.textContent = '';
    await loadItems();
    showToast('Item salvo com sucesso.');
  } catch (error) {
    message.textContent = error.message;
  }
});

$('#searchInput').addEventListener('input', renderItems);
$('#logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('curadoria_token');
  dashboardView.classList.add('hidden');
  authView.classList.remove('hidden');
  $('#authForm').reset();
  setAuthMode('login');
  showToast('Sessão encerrada.');
});
$('#newItemBtn').addEventListener('click', () => {
  const panel = $('#itemFormPanel');
  panel.classList.add('open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#closeFormBtn').addEventListener('click', () => $('#itemFormPanel').classList.remove('open'));

if (localStorage.getItem('curadoria_token')) openDashboard();
