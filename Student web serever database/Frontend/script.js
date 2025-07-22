/* script.js */

// Element refs
const signupForm       = document.getElementById('signup-form');
const loginForm        = document.getElementById('login-form');
const logoutBtn        = document.getElementById('logout-btn');
const studentSection   = document.getElementById('student-section');
const studentTable     = document.getElementById('student-table');
const studentTbody     = studentTable.querySelector('tbody');
const addStudentForm   = document.getElementById('add-student-form');
const editStudentForm  = document.getElementById('edit-student-form');
const searchInput      = document.getElementById('search-input');
const searchBtn        = document.getElementById('search-btn');
const adminControls    = document.getElementById('admin-controls');
const showAddBtn       = document.getElementById('show-add-btn');
const exportCsvBtn     = document.getElementById('export-btn');
const exportExcelBtn   = document.getElementById('export-excel-btn');

// Helpers
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64    = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d) ? '' : d.toLocaleDateString('en-CA');
}

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function renderStudents(students) {
  studentTbody.innerHTML = '';
  students.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.student_id}</td>
      <td>${s.name}</td>
      <td>${s.email}</td>
      <td>${s.phone || ''}</td>
      <td>${formatDate(s.birth_date)}</td>
      <td>${s.gender || ''}</td>
      <td>${s.course}</td>
      <td>
        ${window.userRole === 'admin' ? `
          <button class="edit-btn" data-id="${s.student_id}">Edit</button>
          <button class="delete-btn" data-id="${s.student_id}">Delete</button>
        ` : ''}
      </td>
    `;
    studentTbody.appendChild(tr);
  });
}

async function loadStudents() {
  try {
    const res = await fetch('http://localhost:5000/api/students', {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch students');
    window.studentData = await res.json();
    renderStudents(window.studentData);
  } catch (err) {
    console.error(err);
    alert('Session expired or unauthorized. Please log in again.');
    logoutCleanup();
  }
}

function logoutCleanup() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  loginForm.classList.remove('hidden');
  signupForm?.classList.remove('hidden');
  signupForm?.previousElementSibling?.classList.remove('hidden');
  loginForm.previousElementSibling.classList.remove('hidden');
  studentSection.classList.add('hidden');
  adminControls.classList.add('hidden');
}

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // === Auto-login if valid token ===
  const token = localStorage.getItem('token');
  if (token) {
    const payload = parseJwt(token);
    if (payload && payload.exp * 1000 > Date.now()) {
      window.userRole = payload.role;
      localStorage.setItem('role', window.userRole);
      loginForm.classList.add('hidden');
      signupForm?.classList.add('hidden');
      signupForm?.previousElementSibling?.classList.add('hidden');
      loginForm.previousElementSibling.classList.add('hidden');
      studentSection.classList.remove('hidden');
      if (window.userRole === 'admin') adminControls.classList.remove('hidden');
      loadStudents();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  }

  // === Signup ===
  signupForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const u = signupForm['signup-username'].value.trim();
    const p = signupForm['signup-password'].value.trim();
    const r = signupForm['signup-role']?.value || 'guest';
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: u, password: p, role: r })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      alert('User created successfully!');
      signupForm.reset();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // === Login ===
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const u = loginForm['username'].value.trim();
    const p = loginForm['password'].value.trim();
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('token', data.token);
      window.userRole = parseJwt(data.token)?.role;
      localStorage.setItem('role', window.userRole);
      loginForm.classList.add('hidden');
      signupForm?.classList.add('hidden');
      signupForm?.previousElementSibling?.classList.add('hidden');
      loginForm.previousElementSibling.classList.add('hidden');
      studentSection.classList.remove('hidden');
      if (window.userRole === 'admin') adminControls.classList.remove('hidden');
      loadStudents();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  // === Logout ===
  logoutBtn.addEventListener('click', () => {
    logoutCleanup();
    alert('Logged out successfully');
  });

  // === Add/Edit/Delete handlers ===
  showAddBtn.addEventListener('click', () => {
    addStudentForm.classList.toggle('hidden');
    editStudentForm.classList.add('hidden');
  });

  addStudentForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const newS = {
      student_id: addStudentForm['add-student_id'].value.trim(),
      name:       addStudentForm['add-name'].value.trim(),
      email:      addStudentForm['add-email'].value.trim(),
      phone:      addStudentForm['add-phone'].value.trim()||null,
      birth_date: addStudentForm['add-birth_date'].value||null,
      gender:     addStudentForm['add-gender'].value||null,
      course:     addStudentForm['add-course'].value.trim(),
    };
    try {
      const res = await fetch('http://localhost:5000/api/students', {
        method:  'POST',
        headers: getAuthHeaders(),
        body:    JSON.stringify(newS)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      alert('Student added!');
      addStudentForm.reset();
      loadStudents();
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  });

  editStudentForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const id = editStudentForm['edit-student_id'].value;
    const upd = {
      name:       editStudentForm['edit-name'].value.trim(),
      email:      editStudentForm['edit-email'].value.trim(),
      phone:      editStudentForm['edit-phone'].value.trim()||null,
      birth_date: editStudentForm['edit-birth_date'].value||null,
      gender:     editStudentForm['edit-gender'].value||null,
      course:     editStudentForm['edit-course'].value.trim(),
    };
    try {
      const res = await fetch(`http://localhost:5000/api/students/${id}`, {
        method:  'PATCH',
        headers: getAuthHeaders(),
        body:    JSON.stringify(upd)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      alert('Student updated!');
      editStudentForm.reset();
      editStudentForm.classList.add('hidden');
      loadStudents();
    } catch (err) {
      console.error(err);
      alert(err.message);
      if (/unauthorized|expired/i.test(err.message)) logoutCleanup();
    }
  });

  studentTable.addEventListener('click', e => {
    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      if (!confirm(`Delete student ${id}?`)) return;
      fetch(`http://localhost:5000/api/students/${id}`, {
        method:  'DELETE',
        headers: getAuthHeaders()
      })
      .then(r => r.json())
      .then(d => {
        if (!d) throw new Error('Delete failed');
        alert('Deleted!');
        loadStudents();
      })
      .catch(err => { console.error(err); alert(err.message); });
    }
    else if (e.target.classList.contains('edit-btn')) {
      const id = e.target.dataset.id;
      const s  = window.studentData.find(x => x.student_id === id);
      if (!s) return;
      editStudentForm['edit-student_id'].value = s.student_id;
      editStudentForm['edit-name'].value       = s.name;
      editStudentForm['edit-email'].value      = s.email;
      editStudentForm['edit-phone'].value      = s.phone||'';
      editStudentForm['edit-birth_date'].value = s.birth_date?.split('T')[0]||'';
      editStudentForm['edit-gender'].value     = s.gender||'';
      editStudentForm['edit-course'].value     = s.course;
      editStudentForm.classList.remove('hidden');
      addStudentForm.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  // === Search ===
  searchBtn.addEventListener('click', () => {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = window.studentData.filter(s =>
      s.student_id.toLowerCase().includes(term) ||
      s.name.toLowerCase().includes(term) ||
      s.course.toLowerCase().includes(term)
    );
    renderStudents(filtered);
  });

  

  // === Excel Export (.xls via HTML table) ===
  exportExcelBtn.addEventListener('click', () => {
    const tableHTML = studentTable.outerHTML;
    const excelBlob = new Blob([`
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Students</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>${tableHTML}</body>
      </html>
    `], { type: 'application/vnd.ms-excel' });

    const url = window.URL.createObjectURL(excelBlob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = 'students.xls';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // === Show export buttons only to admin ===
  if (localStorage.getItem('role') === 'admin') {
    exportCsvBtn.style.display   = 'inline-block';
    exportExcelBtn.style.display = 'inline-block';
  }
});
