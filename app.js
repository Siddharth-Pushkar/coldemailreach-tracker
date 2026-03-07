import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, 'applications');

// DOM
const appForm = document.getElementById('appForm');
const cards = document.getElementById('cards');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const modalDelete = document.getElementById('modalDelete');
const searchInput = document.getElementById('search');

let allItems = [];
let currentFilter = '';

function formatDate(d){
  if(!d) return '';
  // Firestore Timestamp has toDate()
  if(typeof d === 'object' && d !== null && typeof d.toDate === 'function'){
    return d.toDate().toLocaleDateString();
  }
  // If already a Date
  if(d instanceof Date) return d.toLocaleDateString();
  // If ISO string
  try{ const dt = new Date(d); if(!isNaN(dt)) return dt.toLocaleDateString(); }catch(e){}
  return String(d);
}

function statusClass(status){
  if(!status) return 'sent';
  const s = status.toLowerCase();
  if(s.includes('sent')) return 'sent';
  if(s.includes('follow')) return 'follow';
  if(s.includes('under') || s.includes('process')) return 'processing';
  if(s.includes('reject')) return 'rejected';
  if(s.includes('accept')) return 'accepted';
  return 'sent';
}

function renderList(items){
  cards.innerHTML = '';
  items.forEach(item=>{
    const c = document.createElement('div');
    c.className = 'card';
    c.dataset.id = item.id;
    c.innerHTML = `
      <div class="card-left">
        <h3>${escapeHtml(item.company || '')}</h3>
        <div class="card-info">
          <span>${escapeHtml(item.position || 'N/A')}</span>
          <span>•</span>
          <span>${escapeHtml(item.approach || 'N/A')}</span>
          <span>•</span>
          <span>${formatDate(item.emailDate) || 'No date'}</span>
        </div>
      </div>
      <div class="card-right">
        <div class="status ${statusClass(item.status)}">${escapeHtml(item.status || '')}</div>
        <select class="quick-status" data-id="${item.id}">
          <option value="sent">Sent</option>
          <option value="follow up">Follow Up</option>
          <option value="under process">Under Process</option>
          <option value="rejected">Rejected</option>
          <option value="accepted">Accepted</option>
        </select>
        <button class="delete-btn" data-id="${item.id}">Delete</button>
      </div>
    `;

    // set select current value
    const sel = c.querySelector('.quick-status');
    if(sel) sel.value = item.status || 'sent';

    // clicking card opens modal
    c.addEventListener('click',()=>openModal(item));

    // prevent select bubbling
    sel.addEventListener('click',e=>e.stopPropagation());
    sel.addEventListener('change', async (e)=>{
      e.stopPropagation();
      const id = e.target.dataset.id;
      const newStatus = e.target.value;
      try{
        await updateDoc(doc(db,'applications',id),{status:newStatus});
      }catch(err){console.error('update status',err)}
    });

    const delBtn = c.querySelector('.delete-btn');
    delBtn.addEventListener('click', async (e)=>{
      e.stopPropagation();
      const id = e.target.dataset.id;
      if(!confirm('Delete this application?')) return;
      try{ await deleteDoc(doc(db,'applications',id)); }catch(err){console.error('delete',err)}
    });

    cards.appendChild(c);
  });
}

function openModal(item){
  const statusClass_ = statusClass(item.status);
  const modalHeader = document.getElementById('modalHeader');
  modalHeader.innerHTML = `<h2>${escapeHtml(item.company || '')}</h2>`;
  modalBody.innerHTML = `
      <div class="modal-section">
        <div class="modal-section-title">Job Details</div>
        <div class="modal-fields">
          <div class="modal-field">
            <strong>Position:</strong>
            <span>${escapeHtml(item.position || 'N/A')}</span>
          </div>
          <div class="modal-field">
            <strong>Company type:</strong>
            <span>${escapeHtml(item.companyType || 'N/A')}</span>
          </div>
          <div class="modal-field">
            <strong>Approach:</strong>
            <span>${escapeHtml(item.approach || 'N/A')}</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Status & Timeline</div>
        <div class="modal-fields">
          <div class="modal-field">
            <strong>Status:</strong>
            <span><div class="status ${statusClass_}" style="display:inline-block">${escapeHtml(item.status || '')}</div></span>
          </div>
          <div class="modal-field">
            <strong>Email date:</strong>
            <span>${formatDate(item.emailDate) || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Contact & Details</div>
        <div class="modal-fields">
          <div class="modal-field">
            <strong>Email:</strong>
            <span>${escapeHtml(item.emailAddress || 'N/A')}</span>
          </div>
          <div class="modal-field">
            <strong>Resume:</strong>
            <span>${escapeHtml(item.resumeVersion || 'N/A')}</span>
          </div>
          <div class="modal-field" style="grid-column:1/-1">
            <strong>Notes:</strong>
            <span>${escapeHtml(item.notes || 'N/A').replace(/\n/g,'<br>')}</span>
          </div>
        </div>
      </div>
  `;
  modal.classList.remove('hidden');
  modalDelete.dataset.id = item.id;
}

closeModal.addEventListener('click',()=>modal.classList.add('hidden'));
modal.addEventListener('click',(e)=>{if(e.target===modal) modal.classList.add('hidden')});

modalDelete.addEventListener('click', async ()=>{
  const id = modalDelete.dataset.id;
  if(!id) return;
  if(!confirm('Delete this application?')) return;
  try{ await deleteDoc(doc(db,'applications',id)); modal.classList.add('hidden'); }catch(err){console.error('modal delete',err)}
});

appForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = new FormData(appForm);
  const data = {
    company: f.get('company') || '',
    companyType: f.get('companyType') || '',
    position: f.get('position') || '',
    approach: f.get('approach') || '',
    status: f.get('status') || 'sent',
    emailDate: f.get('emailDate') ? new Date(f.get('emailDate')) : null,
    emailAddress: f.get('emailAddress') || '',
    resumeVersion: f.get('resumeVersion') || '',
    notes: f.get('notes') || '',
    createdAt: serverTimestamp()
  };
  try{
    await addDoc(colRef, data);
    appForm.reset();
  }catch(err){console.error('add doc',err)}
});

// realtime listener
const q = query(colRef, orderBy('createdAt','desc'));
onSnapshot(q, snapshot=>{
  const items = [];
  snapshot.forEach(docSnap=>{
    const d = docSnap.data();
    items.push({id:docSnap.id,...d});
  });
  allItems = items;
  applyFilter();
});

function applyFilter(){
  const term = (currentFilter || '').trim().toLowerCase();
  if(!term){ renderList(allItems); return; }
  const filtered = allItems.filter(it=>{
    const company = (it.company||'').toLowerCase();
    const resume = (it.resumeVersion||'').toLowerCase();
    return company.includes(term) || resume.includes(term);
  });
  renderList(filtered);
}

searchInput.addEventListener('input',(e)=>{ currentFilter = e.target.value; applyFilter(); });

function escapeHtml(str){
  if(!str) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#039;');
}
