/* global pdfjsLib */

const SYSTEM_FIELDS = ['id', 'created', 'updated'];
const SENSITIVE_FIELDS = ['password', 'passwordConfirm', 'oldPassword'];
const UNEXTRACTABLE_TYPES = ['file', 'relation', 'autodate'];

let state = {
  pbUrl: '',
  pbToken: '',
  collections: [],
  currentFile: null,
  currentFileName: '',
  ocrServiceUrl: '',
  ocrResult: null,
  targetRecordId: '',
};

function $(id) { return document.getElementById(id); }

function show(id) { $(id).style.display = ''; }
function hide(id) { $(id).style.display = 'none'; }

function qs(selector, parent) {
  return (parent || document).querySelector(selector);
}

// ─── PocketBase API helpers ──────────────────────────────────────

async function pbFetch(path, options = {}) {
  const url = state.pbUrl.replace(/\/+$/, '') + path;
  const headers = { ...options.headers };
  if (state.pbToken) {
    headers['Authorization'] = 'Bearer ' + state.pbToken;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const resp = await fetch(url, { ...options, headers });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`PB API ${resp.status}: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function pbLogin(email, password) {
  return pbFetch('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ identity: email, password }),
  });
}

async function pbListCollections() {
  const data = await pbFetch('/api/collections');
  return data.items || [];
}

async function pbCreateRecord(collection, data, fileField, fileBlob) {
  const body = new FormData();
  for (const [key, val] of Object.entries(data)) {
    if (val !== null && val !== undefined) {
      body.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
    }
  }
  if (fileField && fileBlob) {
    body.append(fileField, fileBlob, state.currentFileName);
  }
  return pbFetch('/api/collections/' + encodeURIComponent(collection) + '/records', {
    method: 'POST',
    body,
  });
}

async function pbUpdateRecord(collection, id, data) {
  return pbFetch('/api/collections/' + encodeURIComponent(collection) + '/records/' + id, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── UI Screens ──────────────────────────────────────────────────

function showUpload() {
  hide('config-section');
  hide('processing-section');
  hide('review-section');
  hide('error-section');
  hide('success-section');
  show('upload-section');
  $('upload-status').textContent = '';
}

function showProcessing() {
  hide('upload-section');
  hide('review-section');
  hide('error-section');
  hide('success-section');
  show('processing-section');
  for (const id of ['step-ocr', 'step-detect', 'step-extract', 'step-ground']) {
    const el = $(id);
    el.className = 'step';
    qs('.step-status', el).textContent = '';
  }
}

function setStep(id, status, msg) {
  const el = $(id);
  el.className = 'step ' + status;
  qs('.step-status', el).textContent = msg || '';
}

function showError(msg) {
  hide('upload-section');
  hide('processing-section');
  hide('review-section');
  hide('success-section');
  show('error-section');
  $('error-message').textContent = msg;
}

function showSuccess(msg) {
  hide('config-section');
  hide('upload-section');
  hide('processing-section');
  hide('review-section');
  hide('error-section');
  show('success-section');
  $('success-message').textContent = msg;

  const pbUrl = state.pbUrl.replace(/\/+$/, '');
  $('success-pb-link').href =
    pbUrl + '/_/collections/' + state.ocrResult.detected_collection + '/' + state.targetRecordId;
}

// ─── Config & Connect ────────────────────────────────────────────

async function handleConnect() {
  const pbUrl = $('pb-url').value.trim();
  const email = $('pb-email').value.trim();
  const password = $('pb-password').value;
  const ocrUrl = $('ocr-url').value.trim().replace(/\/+$/, '');

  if (!pbUrl || !email || !password || !ocrUrl) {
    $('config-status').textContent = 'Please fill in all fields.';
    $('config-status').className = 'status-msg error';
    return;
  }

  state.pbUrl = pbUrl;
  state.ocrServiceUrl = ocrUrl;
  $('config-status').textContent = 'Connecting...';
  $('config-status').className = 'status-msg';

  try {
    const authData = await pbLogin(email, password);
    state.pbToken = authData.token;
    const collections = await pbListCollections();
    state.collections = collections.filter(c => !c.name.startsWith('_') && c.name !== 'document_uploads');
    populateCollectionSelect();
    $('config-status').textContent =
      'Connected. Found ' + state.collections.length + ' collections.';
    $('config-status').className = 'status-msg success';
    showUpload();
  } catch (err) {
    $('config-status').textContent = 'Connection failed: ' + err.message;
    $('config-status').className = 'status-msg error';
  }
}

function populateCollectionSelect() {
  const sel = $('collection-override');
  sel.innerHTML = '<option value="">— Auto-detect —</option>';
  for (const c of state.collections) {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    sel.appendChild(opt);
  }
}

// ─── File Upload ─────────────────────────────────────────────────

function setupFileUpload() {
  const zone = $('upload-zone');
  const input = $('file-input');

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFileSelected(e.dataTransfer.files[0]);
  });

  input.addEventListener('change', () => {
    if (input.files.length) handleFileSelected(input.files[0]);
  });
}

function handleFileSelected(file) {
  const zone = $('upload-zone');
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp'];
  if (!allowed.includes(ext)) {
    $('file-info').textContent = 'Unsupported file type: ' + ext;
    $('process-btn').disabled = true;
    return;
  }

  state.currentFile = file;
  state.currentFileName = file.name;
  zone.classList.add('has-file');
  zone.querySelector('p').textContent = file.name + ' (' + formatSize(file.size) + ')';
  $('file-info').textContent = '';
  $('process-btn').disabled = false;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─── OCR Processing ──────────────────────────────────────────────

async function handleProcess() {
  if (!state.currentFile) return;

  showProcessing();
  $('process-btn').disabled = true;

  /* Phase 1: OCR */
  setStep('step-ocr', 'active', 'Extracting text...');
  let ocrData;
  try {
    ocrData = await callOcrService(state.currentFile);
  } catch (err) {
    setStep('step-ocr', 'error', 'Failed');
    showError('OCR service error: ' + err.message);
    $('process-btn').disabled = false;
    return;
  }
  setStep('step-ocr', 'done', '(' + ocrData.extraction_path + ')');

  if (ocrData.error) {
    setStep('step-detect', 'error', ocrData.error);
    showError(ocrData.error);
    $('process-btn').disabled = false;
    return;
  }

  if (ocrData.detected_collection === 'none') {
    setStep('step-detect', 'error', 'No match');
    showError(
      'Could not determine which collection this document belongs to. ' +
      'The document may need manual triage. OCR text length: ' +
      ocrData.ocr_text.length + ' chars.'
    );
    $('process-btn').disabled = false;
    return;
  }

  setStep('step-detect', 'done', ocrData.detected_collection + ' (' + (ocrData.detection_confidence * 100).toFixed(0) + '%)');
  setStep('step-extract', 'done', Object.keys(ocrData.extracted_fields).length + ' fields');
  setStep('step-ground', 'done', 'Done');

  state.ocrResult = ocrData;
  showReview();
}

async function callOcrService(file) {
  const collectionsPayload = JSON.stringify(prepareCollectionsForOcr());

  const form = new FormData();
  form.append('file', file, file.name);
  form.append('collections', collectionsPayload);

  const resp = await fetch(state.ocrServiceUrl + '/api/process', {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('OCR service returned ' + resp.status + ': ' + text.slice(0, 300));
  }

  return resp.json();
}

function prepareCollectionsForOcr() {
  return state.collections.map(c => ({
    name: c.name,
    fields: (c.fields || []).filter(f =>
      !SYSTEM_FIELDS.includes(f.name) &&
      !SENSITIVE_FIELDS.includes(f.name)
    ).map(f => ({
      name: f.name,
      type: f.type,
      required: f.required || false,
      values: f.values || [],
      help: f.help || '',
      min: f.min,
      max: f.max,
    })),
  }));
}

// ─── Review Screen ───────────────────────────────────────────────

function showReview() {
  hide('upload-section');
  hide('processing-section');
  hide('error-section');
  hide('success-section');
  show('review-section');

  const result = state.ocrResult;

  $('detection-badge').textContent = result.detected_collection;
  $('detection-badge').className = 'badge collection';

  $('ocr-text-display').textContent = result.ocr_text;

  showDocumentPreview(state.currentFile);

  renderForm(result);
}

function showDocumentPreview(file) {
  const container = $('document-preview');
  container.innerHTML = '';
  container.className = '';

  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'pdf') {
    renderPdfPreview(file, container);
  } else {
    const url = URL.createObjectURL(file);
    const img = document.createElement('img');
    img.src = url;
    container.appendChild(img);
  }
}

async function renderPdfPreview(file, container) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    container.appendChild(canvas);
  } catch (err) {
    container.textContent = 'PDF preview not available: ' + err.message;
    container.className = 'empty';
  }
}

function renderForm(result) {
  const form = $('review-form');
  form.innerHTML = '';

  const fields = result.collection_fields || [];
  const extracted = result.extracted_fields || {};
  const confidence = result.field_confidence || {};

  for (const field of fields) {
    if (UNEXTRACTABLE_TYPES.includes(field.type)) continue;
    if (SYSTEM_FIELDS.includes(field.name)) continue;

    const value = extracted[field.name] !== undefined ? extracted[field.name] : '';
    const conf = confidence[field.name] || { score: 0, flagged: true, note: '' };
    const isFlagged = conf.flagged;

    const group = document.createElement('div');
    group.className = 'field-group' + (isFlagged ? ' flagged' : '');

    const header = document.createElement('div');
    header.className = 'field-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'field-name';
    nameSpan.textContent = field.name;
    if (field.required) {
      const req = document.createElement('span');
      req.className = 'field-required';
      req.textContent = ' *required';
      nameSpan.appendChild(req);
    }
    header.appendChild(nameSpan);

    const confBadge = document.createElement('span');
    confBadge.className = 'field-confidence';
    if (conf.score >= 0.9) {
      confBadge.className += ' high';
      confBadge.textContent = (conf.score * 100).toFixed(0) + '%';
    } else if (conf.score >= 0.5) {
      confBadge.className += ' medium';
      confBadge.textContent = (conf.score * 100).toFixed(0) + '%';
    } else {
      confBadge.className += ' low';
      confBadge.textContent = (conf.score * 100).toFixed(0) + '%';
    }
    header.appendChild(confBadge);
    group.appendChild(header);

    const input = createFieldInput(field, value);
    input.dataset.fieldName = field.name;
    input.dataset.fieldType = field.type;
    if (field.required) input.dataset.required = 'true';
    group.appendChild(input);

    if (conf.note) {
      const note = document.createElement('div');
      note.className = 'field-note';
      note.textContent = conf.note;
      group.appendChild(note);
    }

    form.appendChild(group);
  }
}

function createFieldInput(field, value) {
  const type = field.type;

  if (type === 'bool') {
    const label = document.createElement('label');
    label.className = 'checkbox-label';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    if (value === true || value === 'true' || value === 1 || value === '1') cb.checked = true;
    cb.className = 'field-input';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + (field.name)));
    return label;
  }

  if (type === 'select') {
    const sel = document.createElement('select');
    sel.className = 'field-input';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— Select —';
    sel.appendChild(emptyOpt);
    for (const v of (field.values || [])) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      if (String(value) === v) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  if (type === 'editor' || (type === 'text' && String(value).length > 200)) {
    const ta = document.createElement('textarea');
    ta.className = 'field-input large';
    ta.value = value !== null && value !== undefined ? String(value) : '';
    return ta;
  }

  if (type === 'number') {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'field-input';
    inp.step = 'any';
    if (field.min !== null && field.min !== undefined) inp.min = field.min;
    if (field.max !== null && field.max !== undefined) inp.max = field.max;
    inp.value = value !== null && value !== undefined ? value : '';
    return inp;
  }

  if (type === 'date') {
    const inp = document.createElement('input');
    inp.type = 'date';
    inp.className = 'field-input';
    if (value) {
      const d = new Date(value);
      if (!isNaN(d)) inp.value = d.toISOString().split('T')[0];
    }
    return inp;
  }

  if (type === 'email') {
    const inp = document.createElement('input');
    inp.type = 'email';
    inp.className = 'field-input';
    inp.value = value !== null && value !== undefined ? String(value) : '';
    return inp;
  }

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'field-input';
  inp.value = value !== null && value !== undefined ? String(value) : '';
  return inp;
}

function collectFormData() {
  const data = {};
  const inputs = $('review-form').querySelectorAll('.field-input');
  for (const input of inputs) {
    const name = input.dataset.fieldName;
    if (!name) continue;
    if (input.type === 'checkbox') {
      data[name] = input.checked;
    } else if (input.type === 'number') {
      data[name] = input.value !== '' ? parseFloat(input.value) : null;
    } else {
      data[name] = input.value !== '' ? input.value : null;
    }
  }
  return data;
}

// ─── Confirm & Save ──────────────────────────────────────────────

async function handleConfirm() {
  if (!state.ocrResult) return;

  const result = state.ocrResult;
  const collectionName = result.detected_collection;
  const formData = collectFormData();

  $('save-status').textContent = 'Saving...';
  $('save-status').className = 'status-msg';

  try {
    const record = await pbCreateRecord(collectionName, formData);
    state.targetRecordId = record.id;

    await saveDocumentUpload(record.id, formData);

    $('save-status').textContent = '';
    showSuccess(
      'Record created in "' + collectionName + '" (ID: ' + record.id + '). ' +
      'The document upload has been archived for audit.'
    );
  } catch (err) {
    $('save-status').textContent = 'Save failed: ' + err.message;
    $('save-status').className = 'status-msg error';
  }
}

async function saveDocumentUpload(targetRecordId, finalData) {
  const result = state.ocrResult;

  const uploadData = {
    ocr_text: result.ocr_text,
    extraction_method: 'local',
    field_confidence: result.field_confidence || {},
    verified_by_user: true,
    verified_at: new Date().toISOString(),
    status: 'verified',
    target_collection: result.detected_collection,
    extracted_data: result.extracted_fields || {},
    extraction_path: result.extraction_path,
    target_record_id: targetRecordId,
  };

  await pbCreateRecord('document_uploads', uploadData, 'source_file', state.currentFile);
}

async function handleReject() {
  if (!state.ocrResult) return;

  $('save-status').textContent = 'Saving rejection...';
  $('save-status').className = 'status-msg';

  try {
    const result = state.ocrResult;
    const uploadData = {
      ocr_text: result.ocr_text,
      extraction_method: 'local',
      status: 'rejected',
      target_collection: result.detected_collection,
      extracted_data: result.extracted_fields || {},
      extraction_path: result.extraction_path,
    };
    await pbCreateRecord('document_uploads', uploadData, 'source_file', state.currentFile);
    showSuccess('Document rejected and archived. No record was created.');
  } catch (err) {
    $('save-status').textContent = 'Failed to save rejection: ' + err.message;
    $('save-status').className = 'status-msg error';
  }
}

// ─── Reset ───────────────────────────────────────────────────────

function resetForNewUpload() {
  state.currentFile = null;
  state.currentFileName = '';
  state.ocrResult = null;
  state.targetRecordId = '';
  $('file-input').value = '';
  $('upload-zone').className = 'upload-zone';
  $('upload-zone').querySelector('p').textContent = 'Drag & drop a PDF or image here, or click to browse';
  $('process-btn').disabled = true;
  $('file-info').textContent = '';
}

// ─── Init ────────────────────────────────────────────────────────

function init() {
  setupFileUpload();

  $('connect-btn').addEventListener('click', handleConnect);
  $('process-btn').addEventListener('click', handleProcess);
  $('confirm-btn').addEventListener('click', handleConfirm);
  $('reject-btn').addEventListener('click', handleReject);
  $('error-back-btn').addEventListener('click', () => { showUpload(); });
  $('success-another-btn').addEventListener('click', () => {
    resetForNewUpload();
    showUpload();
  });
}

document.addEventListener('DOMContentLoaded', init);
