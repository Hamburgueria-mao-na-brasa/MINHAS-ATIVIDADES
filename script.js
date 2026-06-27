const categories = {
  trabalho: { name: 'Trabalho', color: '#d49b27', chip: 'rgba(212,155,39,.13)' },
  igreja: { name: 'Igreja', color: '#3f83c5', chip: 'rgba(63,131,197,.12)' },
  marketing: { name: 'Marketing', color: '#6c9b57', chip: 'rgba(108,155,87,.13)' },
  estudos: { name: 'Estudos', color: '#8b6ec7', chip: 'rgba(139,110,199,.13)' },
  cliente: { name: 'Clientes', color: '#9b6d52', chip: 'rgba(155,109,82,.13)' },
  pessoal: { name: 'Pessoal', color: '#ca6578', chip: 'rgba(202,101,120,.12)' },
  viagem: { name: 'Viagem', color: '#e9652d', chip: 'rgba(233,101,45,.13)' },
  sst: { name: 'SST / DDS', color: '#ab8740', chip: 'rgba(171,135,64,.13)' }
};

const SUPABASE_URL = 'https://uukdywfazqvewkwvrweq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_x9nZe7KgH4M1KiSN13rwWg_we5G4t1i';
const AUTH_SESSION_LIMIT_MS = 2 * 60 * 60 * 1000;

const seedEvents = [
  { title:'Trabalho', date:'2026-06-25', time:'08:00', category:'trabalho', description:'Atendimento e projetos', priority:'alta', status:'pendente' },
  { title:'DDS', date:'2026-06-25', time:'09:00', category:'sst', description:'Segurança do Trabalho', priority:'media', status:'pendente' },
  { title:'Marketing', date:'2026-06-25', time:'14:00', category:'marketing', description:'Conteúdo para clientes', priority:'media', status:'pendente' },
  { title:'Estudo', date:'2026-06-25', time:'20:00', category:'estudos', description:'Leitura e anotações', priority:'baixa', status:'pendente' },
  { title:'Culto', date:'2026-06-28', time:'19:00', category:'igreja', description:'Igreja / ministério', priority:'alta', status:'pendente' },
  { title:'La Torre', date:'2026-06-30', time:'15:00', category:'cliente', description:'Conteúdo e agenda', priority:'media', status:'pendente' },
  { title:'Trabalho', date:'2026-06-27', time:'08:00', category:'trabalho', description:'Plantão', priority:'alta', status:'pendente' },
  { title:'Mídia', date:'2026-06-29', time:'19:30', category:'igreja', description:'Escala da mídia', priority:'media', status:'pendente' },
  { title:'Cliente Cacauê', date:'2026-06-26', time:'14:00', category:'cliente', description:'Ajustes do site', priority:'alta', status:'pendente' },
  { title:'Viagem', date:'2026-07-03', time:'08:00', category:'viagem', description:'Dia inteiro', priority:'media', status:'pendente' },
  { title:'Reunião', date:'2026-07-04', time:'10:00', category:'marketing', description:'Alinhamento de conteúdo', priority:'media', status:'pendente' },
  { title:'Academia', date:'2026-07-04', time:'19:00', category:'pessoal', description:'Treino de força', priority:'baixa', status:'pendente' }
];

const seedTasks = [
  {text:'Preparar conteúdos da semana', done:true, due:'2026-06-25', priority:'media'},
  {text:'Revisar compromissos da igreja', done:true, due:'2026-06-25', priority:'media'},
  {text:'Separar tarefas de SST', done:false, due:'2026-06-26', priority:'alta'},
  {text:'Conferir agenda dos clientes', done:false, due:'2026-06-27', priority:'media'}
];

const seedNotes = [
  {title:'Ideia para rotina', text:'Separar horários fixos para trabalho, marketing, igreja e estudos.', date:'25/06/2026'},
  {title:'Lembrete', text:'Revisar as atividades do próximo dia antes de dormir.', date:'25/06/2026'}
];

const goals = [
  {title:'Organizar rotina semanal', description:'Manter compromissos e tarefas em dia.', progress:70},
  {title:'Avançar projetos digitais', description:'Sites, conteúdos e clientes bem alinhados.', progress:55},
  {title:'Cuidar da vida espiritual', description:'Cultos, mídia, ensaios e ministério.', progress:80},
  {title:'Estudos e crescimento', description:'Aprender algo novo toda semana.', progress:45},
  {title:'Segurança do Trabalho', description:'DDS, documentos e acompanhamentos.', progress:60},
  {title:'Vida pessoal', description:'Família, saúde e descanso.', progress:50}
];

const STORAGE = {
  events: 'minhasAtividades.events',
  tasks: 'minhasAtividades.tasks',
  notes: 'minhasAtividades.notes',
  settings: 'minhasAtividades.settings',
  notified: 'minhasAtividades.notified',
  authLoginAt: 'minhasAtividades.authLoginAt'
};

const defaultSettings = {
  userName: 'Willian',
  defaultTime: '08:00',
  notifyMinutes: 60
};

let events = JSON.parse(localStorage.getItem(STORAGE.events) || 'null') || seedEvents;
let tasks = JSON.parse(localStorage.getItem(STORAGE.tasks) || 'null') || seedTasks;
let notes = JSON.parse(localStorage.getItem(STORAGE.notes) || 'null') || seedNotes;
let settings = { ...defaultSettings, ...(JSON.parse(localStorage.getItem(STORAGE.settings) || 'null') || {}) };
let notified = JSON.parse(localStorage.getItem(STORAGE.notified) || 'null') || {};
let current = new Date();
let selected = new Date();
let activePage = 'inicio';
let activeCategory = 'todas';
let notificationTimer = null;
let supabaseClient = null;
let currentUser = null;
let suppressRemoteSync = false;
let remoteSyncTimer = null;
let authAction = 'signin';

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2,'0');
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,7);
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const brDate = (d) => d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const parseDate = (iso) => { const [y,m,d] = iso.split('-').map(Number); return new Date(y, m-1, d); };
const todayISO = () => toISO(new Date());
const dateAfterDays = (iso, days) => { const d = parseDate(iso); d.setDate(d.getDate() + Number(days || 0)); return toISO(d); };
const esc = (str='') => String(str).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));

function migrateData(){
  events = events.map((e) => ({
    id: e.id || uid(), title: e.title || 'Atividade', date: e.date || todayISO(), time: e.time || '08:00',
    endTime: e.endTime || '',
    category: categories[e.category] ? e.category : 'pessoal', description: e.description || '',
    priority: e.priority || 'media', status: e.status || 'pendente',
    autoWork: Boolean(e.autoWork)
  }));
  tasks = tasks.map((t) => ({
    id: t.id || uid(), text: t.text || 'Tarefa', done: Boolean(t.done),
    due: t.due || todayISO(), priority: t.priority || 'media'
  }));
  notes = notes.map((n) => ({ id: n.id || uid(), title: n.title || 'Anotação', text: n.text || '', date: n.date || new Date().toLocaleDateString('pt-BR') }));
  save();
}

function save(){
  localStorage.setItem(STORAGE.events, JSON.stringify(events));
  localStorage.setItem(STORAGE.tasks, JSON.stringify(tasks));
  localStorage.setItem(STORAGE.notes, JSON.stringify(notes));
  localStorage.setItem(STORAGE.settings, JSON.stringify(settings));
  localStorage.setItem(STORAGE.notified, JSON.stringify(notified));
  queueRemoteSync();
}

async function initSupabase(){
  if(!window.supabase || !SUPABASE_URL || !SUPABASE_KEY){
    setAuthStatus('Supabase indisponível. Usando salvamento local.');
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session ? data.session.user : null;
  if(data.session && isAuthExpired()){
    await supabaseClient.auth.signOut();
    currentUser = null;
    localStorage.removeItem(STORAGE.authLoginAt);
    setAuthStatus('Sessão expirada. Entre novamente.');
  }
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    if(session && !localStorage.getItem(STORAGE.authLoginAt)){
      localStorage.setItem(STORAGE.authLoginAt, String(Date.now()));
    }
    if(!session){
      localStorage.removeItem(STORAGE.authLoginAt);
    }
    updateAuthUI();
    if(currentUser) loadRemoteData();
  });
  updateAuthUI();
  if(currentUser) await loadRemoteData();
}

function setAuthStatus(text){
  if($('authStatus')) $('authStatus').textContent = text;
}

function updateAuthUI(){
  const logged = Boolean(currentUser);
  if($('authTitle')) $('authTitle').textContent = logged ? 'Agenda sincronizada' : 'Entrar na agenda';
  setAuthStatus(logged ? `Conectado como ${currentUser.email}. A senha será pedida novamente em até 2 horas.` : 'Digite e-mail e senha para acessar a agenda.');
  if($('authForm')) $('authForm').style.display = logged ? 'none' : 'flex';
  if($('logoutBtn')) $('logoutBtn').style.display = logged ? 'inline-flex' : 'none';
  if($('authPanel')) $('authPanel').classList.toggle('locked', !logged);
  document.body.classList.toggle('auth-locked', !logged);
}

function isAuthExpired(){
  const loginAt = Number(localStorage.getItem(STORAGE.authLoginAt) || 0);
  return !loginAt || Date.now() - loginAt > AUTH_SESSION_LIMIT_MS;
}

function queueRemoteSync(){
  if(suppressRemoteSync || !currentUser || !supabaseClient) return;
  clearTimeout(remoteSyncTimer);
  remoteSyncTimer = setTimeout(syncRemoteData, 700);
}

async function init(){
  await initSupabase();
  migrateData();
  applySettings();
  $('eventCategory').innerHTML = Object.entries(categories).map(([key,c]) => `<option value="${key}">${c.name}</option>`).join('');
  renderLegend('legend');
  renderLegend('legendFull');
  renderCategoryFilters();

  $('prevMonth').onclick = () => { current.setMonth(current.getMonth()-1); render(); };
  $('nextMonth').onclick = () => { current.setMonth(current.getMonth()+1); render(); };
  $('goToday').onclick = () => { current = new Date(); selected = new Date(); render(); };
  if($('prevMonthFull')) $('prevMonthFull').onclick = () => { current.setMonth(current.getMonth()-1); render(); };
  if($('nextMonthFull')) $('nextMonthFull').onclick = () => { current.setMonth(current.getMonth()+1); render(); };
  if($('goTodayFull')) $('goTodayFull').onclick = () => { current = new Date(); selected = new Date(); render(); };
  if($('monthJump')) $('monthJump').onchange = () => jumpToMonth($('monthJump').value);
  $('openEventModal').onclick = () => openModal({ date: toISO(selected) });
  $('mobileAdd').onclick = () => openModal({ date: toISO(selected) });
  $('addSelectedDay').onclick = () => openModal({ date: toISO(selected) });
  if($('addSelectedDayFull')) $('addSelectedDayFull').onclick = () => openModal({ date: toISO(selected) });
  $('calendarNew').onclick = () => openModal({ date: toISO(selected) });
  $('searchBtn').onclick = openSearch;
  $('notifyBtn').onclick = enableNotifications;
  $('closeEventModal').onclick = () => $('eventDialog').close();
  $('deleteEventBtn').onclick = deleteCurrentEvent;
  $('completeEventBtn').onclick = completeCurrentEvent;
  if($('eventRepeat')) $('eventRepeat').onchange = updateRepeatIntervalVisibility;
  if($('closeSearchModal')) $('closeSearchModal').onclick = () => $('searchDialog').close();
  if($('searchInput')) $('searchInput').addEventListener('input', renderSearchResults);
  if($('settingsForm')) $('settingsForm').addEventListener('submit', saveSettingsFromForm);
  if($('exportBackup')) $('exportBackup').onclick = exportBackup;
  if($('importBackup')) $('importBackup').onclick = () => $('backupFile').click();
  if($('backupFile')) $('backupFile').addEventListener('change', importBackup);
  if($('closeTaskModal')) $('closeTaskModal').onclick = () => $('taskDialog').close();
  if($('taskEditCancel')) $('taskEditCancel').onclick = () => $('taskDialog').close();
  if($('taskEditDelete')) $('taskEditDelete').onclick = deleteTaskFromModal;
  if($('taskEditForm')) $('taskEditForm').addEventListener('submit', saveTaskFromModal);
  if($('authForm')) $('authForm').addEventListener('submit', handleAuthSubmit);
  document.querySelectorAll('[data-auth-action]').forEach(btn => btn.addEventListener('click', () => { authAction = btn.dataset.authAction; }));
  if($('logoutBtn')) $('logoutBtn').onclick = logout;

  document.querySelectorAll('[data-page]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.page)));
  $('eventForm').addEventListener('submit', saveEventFromModal);
  $('taskForm').addEventListener('submit', addQuickTask);
  $('noteForm').addEventListener('submit', addNote);
  if($('workStartDate')) $('workStartDate').value = todayISO();
  if($('workEndDate')) $('workEndDate').value = dateAfterDays(todayISO(), Number($('workDaysRange') ? $('workDaysRange').value : 90));
  if($('workDaysRange')) $('workDaysRange').onchange = () => {
    if($('workStartDate') && $('workEndDate')) $('workEndDate').value = dateAfterDays($('workStartDate').value || todayISO(), Number($('workDaysRange').value || 90));
  };
  if($('workStartDate')) $('workStartDate').onchange = () => {
    if($('workEndDate') && $('workDaysRange')) $('workEndDate').value = dateAfterDays($('workStartDate').value || todayISO(), Number($('workDaysRange').value || 90));
  };
  if($('workScheduleForm')) $('workScheduleForm').addEventListener('submit', generateWorkSchedule);
  if($('removeWorkSchedule')) $('removeWorkSchedule').onclick = removeGeneratedWorkSchedule;
  if($('removePastEvents')) $('removePastEvents').onclick = () => cleanupEvents('past');
  if($('removeCompletedEvents')) $('removeCompletedEvents').onclick = () => cleanupEvents('completed');
  if($('removeCanceledEvents')) $('removeCanceledEvents').onclick = () => cleanupEvents('canceled');
  if($('clearAllEvents')) $('clearAllEvents').onclick = () => cleanupEvents('all');

  renderGoals();
  render();
  renderTasks();
  renderNotes();
  renderWorkPreview();
  showPage('inicio');
  startNotificationWatcher();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

function applySettings(){
  settings = {
    ...defaultSettings,
    ...settings,
    notifyMinutes: Number(settings.notifyMinutes || defaultSettings.notifyMinutes)
  };
  $('todayText').textContent = brDate(new Date());
  if($('settingUserName')) $('settingUserName').value = settings.userName;
  if($('settingDefaultTime')) $('settingDefaultTime').value = settings.defaultTime;
  if($('settingNotifyMinutes')) $('settingNotifyMinutes').value = String(settings.notifyMinutes);
  document.querySelectorAll('[data-title^="Bom dia"]').forEach(section => {
    section.dataset.title = `Bom dia, ${settings.userName}! 👋`;
  });
  if(activePage === 'inicio'){
    document.querySelector('.topbar h1').innerHTML = `Bom dia, ${esc(settings.userName)}! <span>👋</span>`;
  }
}

function renderLegend(id){
  const el = $(id);
  if(!el) return;
  el.innerHTML = Object.entries(categories).map(([key,c]) => `<span><i style="--color:${c.color}"></i>${c.name}</span>`).join('');
}

function renderCategoryFilters(){
  ['categoryFilters','categoryFiltersHome'].forEach((id) => {
    const el = $(id);
    if(!el) return;
    el.innerHTML = `<button class="${activeCategory==='todas'?'active':''}" data-filter="todas">Todos</button>` + Object.entries(categories).map(([key,c]) => `<button class="${activeCategory===key?'active':''}" data-filter="${key}"><i style="--color:${c.color}"></i>${c.name}</button>`).join('');
    el.querySelectorAll('button').forEach(btn => btn.onclick = () => {
      activeCategory = btn.dataset.filter;
      renderCategoryFilters();
      render();
    });
  });
}

function showPage(page){
  activePage = page;
  document.querySelectorAll('.page').forEach(section => section.classList.toggle('active', section.id === `page-${page}`));
  document.querySelectorAll('[data-page]').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
  const section = $(`page-${page}`);
  if(section){
    document.querySelector('.topbar .eyebrow').textContent = section.dataset.subtitle || 'rotina com propósito';
    const title = section.dataset.title || 'Minhas Atividades';
    document.querySelector('.topbar h1').innerHTML = title.includes(settings.userName) ? `Bom dia, ${esc(settings.userName)}! <span>👋</span>` : esc(title);
  }
  window.scrollTo({top:0, behavior:'smooth'});
  render();
}

function openModal({ date, eventId } = {}){
  const form = $('eventForm');
  form.reset();
  $('eventId').value = '';
  $('eventDate').value = date || toISO(selected);
  $('eventTime').value = settings.defaultTime || '08:00';
  $('eventEndTime').value = '';
  $('eventPriority').value = 'media';
  $('eventStatus').value = 'pendente';
  if($('eventRepeat')) $('eventRepeat').value = 'none';
  if($('eventRepeatCount')) $('eventRepeatCount').value = '4';
  if($('eventRepeatInterval')) $('eventRepeatInterval').value = '2';
  updateRepeatIntervalVisibility();
  $('modalKicker').textContent = 'Nova marcação';
  $('modalTitle').textContent = 'Adicionar atividade';
  $('deleteEventBtn').style.display = 'none';
  $('completeEventBtn').style.display = 'none';

  if(eventId){
    const event = events.find(e => e.id === eventId);
    if(!event) return;
    $('eventId').value = event.id;
    $('eventTitle').value = event.title;
    $('eventDate').value = event.date;
    $('eventTime').value = event.time;
    $('eventEndTime').value = event.endTime || '';
    $('eventCategory').value = event.category;
    $('eventPriority').value = event.priority;
    $('eventStatus').value = event.status;
    $('eventDescription').value = event.description;
    if($('eventRepeat')) $('eventRepeat').value = 'none';
    updateRepeatIntervalVisibility();
    $('modalKicker').textContent = 'Editar marcação';
    $('modalTitle').textContent = 'Detalhes da atividade';
    $('deleteEventBtn').style.display = 'inline-flex';
    $('completeEventBtn').style.display = event.status === 'concluida' ? 'none' : 'inline-flex';
  }

  $('eventDialog').showModal();
  setTimeout(() => $('eventTitle').focus(), 100);
}

function saveEventFromModal(e){
  e.preventDefault();
  const id = $('eventId').value;
  const oldEvent = id ? events.find(ev => ev.id === id) : null;
  const repeat = $('eventRepeat') ? $('eventRepeat').value : 'none';
  const repeatCount = $('eventRepeatCount') ? Number($('eventRepeatCount').value || 1) : 1;
  const repeatInterval = $('eventRepeatInterval') ? Number($('eventRepeatInterval').value || 1) : 1;
  const payload = {
    id: id || uid(),
    title: $('eventTitle').value.trim(),
    date: $('eventDate').value,
    time: $('eventTime').value,
    endTime: $('eventEndTime').value,
    category: $('eventCategory').value,
    priority: $('eventPriority').value,
    status: $('eventStatus').value,
    description: $('eventDescription').value.trim(),
    autoWork: Boolean(oldEvent && oldEvent.autoWork)
  };
  if(id){
    events = events.map(ev => ev.id === id ? payload : ev);
  } else {
    events.push(payload);
    if(repeat !== 'none'){
      addRecurringEvents(payload, repeat, repeatCount, repeatInterval);
    }
  }
  selected = parseDate(payload.date);
  save();
  $('eventDialog').close();
  renderAll();
}

function addRecurringEvents(base, repeat, count, intervalDays = 1){
  const total = Math.min(Math.max(Number(count || 2), 2), 120);
  const customInterval = Math.min(Math.max(Number(intervalDays || 1), 1), 365);
  const start = parseDate(base.date);
  for(let i=1; i<total; i++){
    const d = new Date(start);
    if(repeat === 'daily') d.setDate(start.getDate() + i);
    if(repeat === 'weekly') d.setDate(start.getDate() + (i * 7));
    if(repeat === 'monthly') d.setMonth(start.getMonth() + i);
    if(repeat === 'custom') d.setDate(start.getDate() + (i * customInterval));
    events.push({
      ...base,
      id: uid(),
      date: toISO(d),
      autoWork: false
    });
  }
}

function updateRepeatIntervalVisibility(){
  if(!$('eventRepeat') || !$('eventRepeatIntervalWrap')) return;
  $('eventRepeatIntervalWrap').classList.toggle('hidden-field', $('eventRepeat').value !== 'custom');
}

async function handleAuthSubmit(e){
  e.preventDefault();
  if(!supabaseClient){
    setAuthStatus('Supabase ainda não carregou. Verifique a internet.');
    return;
  }
  const email = $('authEmail').value.trim();
  const password = $('authPassword').value;
  if(!email || !password) return;
  setAuthStatus(authAction === 'signup' ? 'Criando conta...' : 'Entrando...');
  const response = authAction === 'signup'
    ? await supabaseClient.auth.signUp({ email, password })
    : await supabaseClient.auth.signInWithPassword({ email, password });

  if(response.error){
    setAuthStatus(response.error.message);
    return;
  }
  if(authAction === 'signup' && !response.data.session){
    setAuthStatus('Conta criada. Se o projeto exigir confirmação, confirme pelo e-mail antes de entrar.');
    return;
  }
  currentUser = response.data.user || (response.data.session && response.data.session.user);
  localStorage.setItem(STORAGE.authLoginAt, String(Date.now()));
  $('authPassword').value = '';
  updateAuthUI();
  await loadRemoteData();
}

async function logout(){
  if(!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  localStorage.removeItem(STORAGE.authLoginAt);
  updateAuthUI();
}

function eventToRow(event){
  return {
    user_id: currentUser.id,
    client_id: event.id,
    title: event.title,
    event_date: event.date,
    start_time: event.time,
    end_time: event.endTime || null,
    category: event.category,
    priority: event.priority,
    status: event.status,
    description: event.description || '',
    auto_work: Boolean(event.autoWork),
    recurrence_group_id: event.recurrenceGroupId || null,
    recurrence_rule: event.recurrenceRule || null
  };
}

function rowToEvent(row){
  return {
    id: row.client_id || row.id,
    title: row.title,
    date: row.event_date,
    time: String(row.start_time).slice(0,5),
    endTime: row.end_time ? String(row.end_time).slice(0,5) : '',
    category: row.category,
    priority: row.priority,
    status: row.status,
    description: row.description || '',
    autoWork: Boolean(row.auto_work),
    recurrenceGroupId: row.recurrence_group_id || null,
    recurrenceRule: row.recurrence_rule || null
  };
}

function taskToRow(task){
  return {
    user_id: currentUser.id,
    client_id: task.id,
    text: task.text,
    due_date: task.due || null,
    priority: task.priority,
    done: Boolean(task.done)
  };
}

function rowToTask(row){
  return {
    id: row.client_id || row.id,
    text: row.text,
    due: row.due_date || todayISO(),
    priority: row.priority,
    done: Boolean(row.done)
  };
}

function noteToRow(note){
  return {
    user_id: currentUser.id,
    client_id: note.id,
    title: note.title,
    body: note.text || ''
  };
}

function rowToNote(row){
  return {
    id: row.client_id || row.id,
    title: row.title,
    text: row.body || '',
    date: row.updated_at ? new Date(row.updated_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')
  };
}

async function loadRemoteData(){
  if(!currentUser || !supabaseClient) return;
  setAuthStatus('Sincronizando com Supabase...');
  const [eventsResp, tasksResp, notesResp, settingsResp] = await Promise.all([
    supabaseClient.from('minhas_atividades_events').select('*').order('event_date').order('start_time'),
    supabaseClient.from('minhas_atividades_tasks').select('*').order('due_date', { nullsFirst:false }),
    supabaseClient.from('minhas_atividades_notes').select('*').order('updated_at', { ascending:false }),
    supabaseClient.from('minhas_atividades_settings').select('*').maybeSingle()
  ]);
  const error = eventsResp.error || tasksResp.error || notesResp.error || settingsResp.error;
  if(error){
    setAuthStatus(`Erro ao carregar Supabase: ${error.message}`);
    return;
  }

  suppressRemoteSync = true;
  if(eventsResp.data.length || tasksResp.data.length || notesResp.data.length){
    events = eventsResp.data.map(rowToEvent);
    tasks = tasksResp.data.map(rowToTask);
    notes = notesResp.data.map(rowToNote);
  }
  if(settingsResp.data){
    settings = {
      userName: settingsResp.data.user_name,
      defaultTime: String(settingsResp.data.default_time).slice(0,5),
      notifyMinutes: settingsResp.data.notify_minutes
    };
  }
  migrateData();
  suppressRemoteSync = false;
  applySettings();
  renderAll();
  renderCategoryFilters();
  setAuthStatus('Sincronizado com Supabase.');
  await syncRemoteData();
}

async function syncRemoteData(){
  if(!currentUser || !supabaseClient || suppressRemoteSync) return;
  try{
    const remote = await Promise.all([
      supabaseClient.from('minhas_atividades_events').select('client_id'),
      supabaseClient.from('minhas_atividades_tasks').select('client_id'),
      supabaseClient.from('minhas_atividades_notes').select('client_id')
    ]);
    const error = remote.find(r => r.error);
    if(error && error.error) throw error.error;

    await Promise.all([
      syncTable('minhas_atividades_events', remote[0].data, events.map(eventToRow), events.map(e => e.id)),
      syncTable('minhas_atividades_tasks', remote[1].data, tasks.map(taskToRow), tasks.map(t => t.id)),
      syncTable('minhas_atividades_notes', remote[2].data, notes.map(noteToRow), notes.map(n => n.id)),
      supabaseClient.from('minhas_atividades_settings').upsert({
        user_id: currentUser.id,
        user_name: settings.userName,
        default_time: settings.defaultTime,
        notify_minutes: settings.notifyMinutes
      }, { onConflict:'user_id' })
    ]);
    setAuthStatus('Alterações salvas no Supabase.');
  } catch(err){
    setAuthStatus(`Falha ao sincronizar: ${err.message}`);
  }
}

async function syncTable(table, remoteRows, rows, localIds){
  const remoteIds = (remoteRows || []).map(row => row.client_id).filter(Boolean);
  const toDelete = remoteIds.filter(id => !localIds.includes(id));
  if(toDelete.length){
    const del = await supabaseClient.from(table).delete().in('client_id', toDelete);
    if(del.error) throw del.error;
  }
  if(rows.length){
    const upsert = await supabaseClient.from(table).upsert(rows, { onConflict:'user_id,client_id' });
    if(upsert.error) throw upsert.error;
  }
}

function deleteCurrentEvent(){
  const id = $('eventId').value;
  if(!id) return;
  if(confirm('Deseja excluir esta atividade?')){
    events = events.filter(e => e.id !== id);
    save();
    $('eventDialog').close();
    renderAll();
  }
}

function completeCurrentEvent(){
  const id = $('eventId').value;
  const ev = events.find(e => e.id === id);
  if(!ev) return;
  ev.status = 'concluida';
  save();
  $('eventDialog').close();
  renderAll();
}

function filteredEvents(list = events){
  return activeCategory === 'todas' ? list : list.filter(e => e.category === activeCategory);
}

function renderAll(){
  render(); renderTasks(); renderNotes(); renderReports(); renderWorkPreview();
}

function render(){
  renderCalendar('calendar');
  renderCalendar('calendarFull');
  renderTimeline();
  renderStats();
  renderReports();
  updateMonthControls();
}

function updateMonthControls(){
  const label = current.toLocaleDateString('pt-BR',{month:'long',year:'numeric'}).replace(/^./, s => s.toUpperCase());
  if($('monthTitle')) $('monthTitle').textContent = label;
  if($('monthTitleFull')) $('monthTitleFull').textContent = label;
  if($('monthJump')) $('monthJump').value = `${current.getFullYear()}-${pad(current.getMonth()+1)}`;
}

function jumpToMonth(value){
  if(!value) return;
  const [year, month] = value.split('-').map(Number);
  current = new Date(year, month - 1, 1);
  selected = new Date(year, month - 1, 1);
  render();
}

function renderStats(){
  const selectedMonth = current.getMonth();
  const selectedYear = current.getFullYear();
  $('todayCount').textContent = events.filter(e => e.date === todayISO() && e.status !== 'cancelada').length;
  $('pendingCount').textContent = tasks.filter(t => !t.done).length + events.filter(e => e.status === 'pendente').length;
  $('monthCount').textContent = events.filter(e => {
    const d = parseDate(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear && e.status !== 'cancelada';
  }).length;
}

function calendarHTML(month){
  const year = current.getFullYear();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const days = [];
  for(let i=0;i<42;i++){
    const d = new Date(start); d.setDate(start.getDate()+i); days.push(d);
  }
  return days.map(d => {
    const iso = toISO(d);
    const dayEvents = filteredEvents(events.filter(e => e.date === iso && e.status !== 'cancelada')).sort((a,b)=>a.time.localeCompare(b.time));
    const visible = dayEvents.slice(0,3);
    const isToday = iso === todayISO();
    const isSelected = iso === toISO(selected);
    return `<button class="day ${d.getMonth()!==month?'muted':''} ${isToday?'today':''} ${isSelected?'selected':''}" data-date="${iso}">
      <span class="day-number">${d.getDate()}</span>
      ${visible.map(e => {
        const c = categories[e.category] || categories.pessoal;
        return `<div class="event-chip ${e.status}" style="--color:${c.color};--chip:${c.chip}"><strong>${esc(e.title)}</strong>${esc(eventTimeLabel(e))}</div>`;
      }).join('')}
      <div class="dots">${dayEvents.slice(0,4).map(e => `<i class="dot" style="--color:${(categories[e.category]||categories.pessoal).color}"></i>`).join('')}</div>
    </button>`;
  }).join('');
}

function renderCalendar(targetId){
  const el = $(targetId);
  if(!el) return;
  el.innerHTML = calendarHTML(current.getMonth());
  el.querySelectorAll('.day').forEach(btn => btn.addEventListener('click', () => {
    selected = parseDate(btn.dataset.date);
    render();
  }));
}

function renderTimeline(){
  const iso = toISO(selected);
  if($('selectedDateText')) $('selectedDateText').textContent = brDate(selected);
  if($('selectedDateTextFull')) $('selectedDateTextFull').textContent = brDate(selected);
  const list = filteredEvents(events.filter(e => e.date === iso)).sort((a,b)=>a.time.localeCompare(b.time));
  const html = list.length ? list.map(e => {
    const c = categories[e.category] || categories.pessoal;
    return `<button class="timeline-item editable ${e.status}" onclick="openModal({eventId:'${e.id}'})">
      <div class="time">${esc(e.time)}</div>
      <div class="activity" style="--color:${c.color};--chip:${c.chip}">
        <strong>${esc(e.title)}</strong>
        <small>${esc(eventTimeLabel(e))} • ${esc(e.description || c.name)}</small>
        <em>${priorityLabel(e.priority)} • ${statusLabel(e.status)}</em>
      </div>
    </button>`;
  }).join('') : `<div class="empty">Nenhuma atividade marcada para este dia.<br><button class="ghost-btn" onclick="openModal({date:'${iso}'})">Adicionar atividade</button></div>`;
  if($('dayTimeline')) $('dayTimeline').innerHTML = html;
  if($('dayTimelineFull')) $('dayTimelineFull').innerHTML = html;
}

function priorityLabel(p){ return ({baixa:'Baixa prioridade', media:'Média prioridade', alta:'Alta prioridade'}[p] || 'Média prioridade'); }
function statusLabel(s){ return ({pendente:'Pendente', concluida:'Concluída', cancelada:'Cancelada'}[s] || 'Pendente'); }
function eventTimeLabel(e){ return e.endTime ? `${e.time} - ${e.endTime}` : e.time; }

function addQuickTask(e){
  e.preventDefault();
  const text = $('taskInput').value.trim();
  if(!text) return;
  tasks.push({ id: uid(), text, done:false, due: todayISO(), priority:'media' });
  $('taskInput').value = '';
  save(); renderAll();
}

function renderTasks(){
  const today = todayISO();
  const overdue = tasks.filter(t => !t.done && t.due < today);
  const priority = tasks.filter(t => !t.done && t.due >= today && t.priority === 'alta');
  const pending = tasks.filter(t => !t.done && t.due >= today && t.priority !== 'alta');
  const done = tasks.filter(t => t.done);
  const columns = [
    ['Prioridades', priority], ['Pendentes', pending], ['Atrasadas', overdue], ['Concluídas', done]
  ];
  const board = $('taskBoard');
  if(board){
    board.innerHTML = columns.map(([title, list]) => `<section class="task-column"><h3>${title} <span>${list.length}</span></h3>${list.length ? list.map(taskHTML).join('') : '<p class="empty small">Nada aqui.</p>'}</section>`).join('');
  }
  $('tasksTotal').textContent = tasks.length;
  $('tasksDone').textContent = done.length;
  $('tasksOpen').textContent = tasks.filter(t=>!t.done).length;
}

function taskHTML(t){
  return `<div class="task-row ${t.done?'done':''}">
    <span>${esc(t.text)}<small>${t.due ? 'Prazo: ' + parseDate(t.due).toLocaleDateString('pt-BR') : ''} • ${priorityLabel(t.priority)}</small></span>
    <div>
      <button title="Concluir" onclick="toggleTask('${t.id}')">✓</button>
      <button title="Editar" onclick="openTaskModal('${t.id}')">✎</button>
      <button title="Excluir" onclick="deleteTask('${t.id}')">×</button>
    </div>
  </div>`;
}

function toggleTask(id){ const t = tasks.find(x => x.id === id); if(t){ t.done = !t.done; save(); renderAll(); } }
function deleteTask(id){ tasks = tasks.filter(t => t.id !== id); save(); renderAll(); }

function openTaskModal(id){
  const task = tasks.find(t => t.id === id);
  if(!task) return;
  $('taskEditId').value = task.id;
  $('taskEditText').value = task.text;
  $('taskEditDue').value = task.due || todayISO();
  $('taskEditPriority').value = task.priority || 'media';
  $('taskEditDone').checked = Boolean(task.done);
  $('taskDialog').showModal();
  setTimeout(() => $('taskEditText').focus(), 100);
}

function saveTaskFromModal(e){
  e.preventDefault();
  const id = $('taskEditId').value;
  tasks = tasks.map(task => task.id === id ? {
    ...task,
    text: $('taskEditText').value.trim() || task.text,
    due: $('taskEditDue').value || todayISO(),
    priority: $('taskEditPriority').value,
    done: $('taskEditDone').checked
  } : task);
  save();
  $('taskDialog').close();
  renderAll();
}

function deleteTaskFromModal(){
  const id = $('taskEditId').value;
  if(!id) return;
  if(confirm('Deseja excluir esta tarefa?')){
    deleteTask(id);
    $('taskDialog').close();
  }
}

function renderGoals(){
  $('goalsGrid').innerHTML = goals.map(g => `<article class="panel goal-card">
    <h2>${esc(g.title)}</h2><p>${esc(g.description)}</p><strong>${g.progress}%</strong>
    <div class="goal-progress"><i style="width:${g.progress}%"></i></div>
  </article>`).join('');
}

function addNote(e){
  e.preventDefault();
  notes.unshift({id:uid(), title:$('noteTitle').value.trim(), text:$('noteText').value.trim(), date:new Date().toLocaleDateString('pt-BR')});
  e.target.reset(); save(); renderNotes();
}
function renderNotes(){
  $('notesList').innerHTML = notes.map(n=>`<div class="note-card"><header><div><strong>${esc(n.title)}</strong><small>${esc(n.date)}</small></div><button onclick="deleteNote('${n.id}')">×</button></header><p>${esc(n.text)}</p></div>`).join('') || '<div class="empty">Nenhuma anotação salva.</div>';
}
function deleteNote(id){ notes = notes.filter(n => n.id !== id); save(); renderNotes(); }

function renderReports(){
  const donePct = tasks.length ? Math.round((tasks.filter(t=>t.done).length / tasks.length) * 100) : 0;
  $('reportEvents').textContent = events.length;
  $('reportTasks').textContent = donePct + '%';
  const max = Math.max(...Object.keys(categories).map(k => events.filter(e=>e.category===k).length), 1);
  $('categoryBars').innerHTML = Object.entries(categories).map(([key,c]) => {
    const total = events.filter(e=>e.category===key).length;
    const width = Math.max((total/max)*100, total ? 8 : 0);
    return `<div class="bar-row"><span>${c.name}</span><div><i style="--color:${c.color};width:${width}%"></i></div><strong>${total}</strong></div>`;
  }).join('');
}

function openSearch(){
  $('searchDialog').showModal();
  $('searchInput').value = '';
  renderSearchResults();
  setTimeout(() => $('searchInput').focus(), 100);
}

function renderSearchResults(){
  const term = ($('searchInput').value || '').trim().toLowerCase();
  const results = [];
  if(term.length >= 2){
    events.forEach(e => {
      const c = categories[e.category] || categories.pessoal;
      const haystack = `${e.title} ${e.description} ${c.name} ${e.date} ${e.time} ${e.endTime || ''}`.toLowerCase();
      if(haystack.includes(term)){
        results.push({ type:'event', id:e.id, title:e.title, meta:`${parseDate(e.date).toLocaleDateString('pt-BR')} • ${eventTimeLabel(e)} • ${c.name}` });
      }
    });
    tasks.forEach(t => {
      const haystack = `${t.text} ${t.due} ${priorityLabel(t.priority)} ${t.done ? 'concluida' : 'pendente'}`.toLowerCase();
      if(haystack.includes(term)){
        results.push({ type:'task', id:t.id, title:t.text, meta:`Tarefa • ${t.done ? 'Concluída' : 'Pendente'} • ${priorityLabel(t.priority)}` });
      }
    });
    notes.forEach(n => {
      const haystack = `${n.title} ${n.text} ${n.date}`.toLowerCase();
      if(haystack.includes(term)){
        results.push({ type:'note', id:n.id, title:n.title, meta:`Anotação • ${n.date}` });
      }
    });
  }
  $('searchResults').innerHTML = term.length < 2
    ? '<div class="empty">Digite pelo menos 2 letras para buscar.</div>'
    : results.slice(0, 30).map(item => `<button type="button" class="search-result" onclick="openSearchResult('${item.type}','${item.id}')"><strong>${esc(item.title)}</strong><span>${esc(item.meta)}</span></button>`).join('') || '<div class="empty">Nada encontrado.</div>';
}

function openSearchResult(type, id){
  $('searchDialog').close();
  if(type === 'event'){
    const event = events.find(e => e.id === id);
    if(!event) return;
    selected = parseDate(event.date);
    current = parseDate(event.date);
    showPage('inicio');
    render();
    openModal({ eventId:id });
  }
  if(type === 'task'){
    showPage('tarefas');
    openTaskModal(id);
  }
  if(type === 'note'){
    showPage('notas');
  }
}

function saveSettingsFromForm(e){
  e.preventDefault();
  settings = {
    userName: $('settingUserName').value.trim() || defaultSettings.userName,
    defaultTime: $('settingDefaultTime').value || defaultSettings.defaultTime,
    notifyMinutes: Number($('settingNotifyMinutes').value || defaultSettings.notifyMinutes)
  };
  save();
  applySettings();
  showPage(activePage);
  if($('settingsStatus')) $('settingsStatus').textContent = 'Ajustes salvos com sucesso.';
}

function exportBackup(){
  const payload = {
    app: 'Minhas Atividades',
    version: 2,
    exportedAt: new Date().toISOString(),
    events,
    tasks,
    notes,
    settings
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `minhas-atividades-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  if($('backupStatus')) $('backupStatus').textContent = 'Backup exportado.';
}

function importBackup(e){
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data.events) || !Array.isArray(data.tasks) || !Array.isArray(data.notes)){
        throw new Error('Formato inválido');
      }
      events = data.events;
      tasks = data.tasks;
      notes = data.notes;
      settings = { ...defaultSettings, ...(data.settings || {}) };
      migrateData();
      applySettings();
      renderAll();
      renderCategoryFilters();
      if($('backupStatus')) $('backupStatus').textContent = 'Backup importado com sucesso.';
    } catch(err){
      if($('backupStatus')) $('backupStatus').textContent = 'Não foi possível importar este arquivo.';
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

async function enableNotifications(){
  if(!('Notification' in window)){
    alert('Este navegador não suporta notificações.');
    return;
  }
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  $('notifyBtn').title = permission === 'granted' ? 'Notificações ativas' : 'Notificações bloqueadas';
  if(permission === 'granted'){
    new Notification('Minhas Atividades', { body:`Lembretes ativados ${settings.notifyMinutes} minutos antes.` });
    checkNotifications();
  } else {
    alert('As notificações não foram autorizadas no navegador.');
  }
}

function startNotificationWatcher(){
  if(notificationTimer) clearInterval(notificationTimer);
  checkNotifications();
  notificationTimer = setInterval(() => {
    enforceAuthExpiration();
    checkNotifications();
  }, 60000);
}

async function enforceAuthExpiration(){
  if(currentUser && isAuthExpired()){
    setAuthStatus('Sessão expirada após 2 horas. Entre novamente.');
    await logout();
  }
}

function checkNotifications(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const today = todayISO();
  Object.keys(notified).forEach(key => {
    if(!key.includes(today)) delete notified[key];
  });
  events
    .filter(e => e.status === 'pendente' && e.date >= today)
    .forEach(e => {
      const eventDate = parseDate(e.date);
      const [hh, mm] = e.time.split(':').map(Number);
      eventDate.setHours(hh || 0, mm || 0, 0, 0);
      const diffMinutes = Math.round((eventDate - now) / 60000);
      const notifyAt = Number(settings.notifyMinutes || 30);
      const key = `${e.id}-${e.date}-${e.time}`;
      if(diffMinutes <= notifyAt && diffMinutes >= 0 && !notified[key]){
        const c = categories[e.category] || categories.pessoal;
        new Notification(e.title, { body:`${c.name} • ${eventTimeLabel(e)}. ${e.description || 'Atividade pendente.'}` });
        notified[key] = true;
        save();
      }
    });
}


function generateWorkSchedule(e){
  e.preventDefault();
  const start = $('workStartDate').value || todayISO();
  const time = $('workStartTime').value || '08:00';
  const range = Number($('workDaysRange').value || 90);
  const end = $('workEndDate') && $('workEndDate').value ? $('workEndDate').value : dateAfterDays(start, range);
  const description = $('workDescription').value.trim() || 'Plantão / trabalho';
  const startDate = parseDate(start);
  const endDate = parseDate(end);
  let added = 0;

  if(endDate < startDate){
    setCleanupStatus('A data de término precisa ser igual ou posterior à data de início.');
    return;
  }

  for(let i=0; ; i+=2){
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    if(d > endDate) break;
    const iso = toISO(d);
    const exists = events.some(ev => ev.autoWork && ev.date === iso);
    if(!exists){
      events.push({
        id: uid(),
        title: 'Trabalho',
        date: iso,
        time,
        endTime: '',
        category: 'trabalho',
        description,
        priority: 'alta',
        status: 'pendente',
        autoWork: true
      });
      added++;
    }
  }
  save();
  setCleanupStatus(`Escala 1x1 gerada até ${parseDate(end).toLocaleDateString('pt-BR')}: ${added} novos dias de trabalho adicionados.`);
  renderAll();
}

function removeGeneratedWorkSchedule(){
  const total = events.filter(e => e.autoWork).length;
  if(!total){ setCleanupStatus('Não existe escala automática para remover.'); return; }
  if(confirm(`Remover ${total} marcações automáticas de trabalho?`)){
    events = events.filter(e => !e.autoWork);
    save();
    setCleanupStatus(`${total} marcações automáticas de trabalho foram removidas.`);
    renderAll();
  }
}

function cleanupEvents(type){
  let message = '';
  const before = events.length;
  if(type === 'past'){
    if(!confirm('Remover todas as atividades com data anterior a hoje?')) return;
    events = events.filter(e => e.date >= todayISO());
    message = 'atividades antigas removidas';
  }
  if(type === 'completed'){
    if(!confirm('Remover todas as atividades concluídas?')) return;
    events = events.filter(e => e.status !== 'concluida');
    message = 'atividades concluídas removidas';
  }
  if(type === 'canceled'){
    if(!confirm('Remover todas as atividades canceladas?')) return;
    events = events.filter(e => e.status !== 'cancelada');
    message = 'atividades canceladas removidas';
  }
  if(type === 'all'){
    if(!confirm('Isso apaga TODAS as atividades da agenda. Deseja continuar?')) return;
    events = [];
    message = 'agenda limpa';
  }
  const removed = before - events.length;
  save();
  setCleanupStatus(`${removed} ${message}.`);
  renderAll();
}

function setCleanupStatus(text){
  if($('cleanupStatus')) $('cleanupStatus').textContent = text;
}

function renderWorkPreview(){
  const box = $('workSchedulePreview');
  if(!box) return;
  const upcoming = events
    .filter(e => e.autoWork && e.date >= todayISO())
    .sort((a,b)=> (a.date+a.time).localeCompare(b.date+b.time))
    .slice(0,8);
  if(!upcoming.length){
    box.innerHTML = `<div class="empty">Nenhuma escala automática cadastrada ainda.<br><span class="work-badge">Hoje é dia de trabalho</span></div>`;
    return;
  }
  box.innerHTML = `<div class="work-badge">Próximos dias de trabalho</div>` + upcoming.map(e => {
    const d = parseDate(e.date).toLocaleDateString('pt-BR',{weekday:'short', day:'2-digit', month:'2-digit'});
    return `<div class="preview-row"><strong>${esc(e.time)}</strong><span>${esc(d)} • ${esc(e.description)}</span><em>Trabalho</em></div>`;
  }).join('');
}

window.openModal = openModal;
window.openSearchResult = openSearchResult;
window.openTaskModal = openTaskModal;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.deleteNote = deleteNote;

init();
