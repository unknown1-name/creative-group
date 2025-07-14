const API = 'https://crazy-aridatha-moss1-576a97f1.koyeb.app/api';
let token = localStorage.getItem('token') || null;
let user = JSON.parse(localStorage.getItem('user') || "null");
const app = document.getElementById('app');

// ---------------- Intro Logo Animation ----------------
window.onload = () => {
  const intro = document.getElementById('intro-logo');
  if (intro) {
    setTimeout(() => {
      intro.style.opacity = '0';
      setTimeout(() => intro.remove(), 1200);
    }, 1700);
  }
  setTimeout(route, 1900);
};

// Navbar حسب نوع المستخدم
function setupNavbar() {
  const nav = document.getElementById('top-navbar');
  const navLinks = document.getElementById('navLinks');
  if (!user) { nav.classList.add('d-none'); return; }
  navLinks.innerHTML = '';
  if (user.role === 'admin') {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link" href="#" id="navInboxTop"><i class="bi bi-inbox-fill"></i> رسائل</a></li>
      <li class="nav-item"><a class="nav-link" href="#" id="navSendTop"><i class="bi bi-envelope-plus"></i> إرسال</a></li>
      <li class="nav-item"><a class="nav-link" href="#" id="navUsersTop"><i class="bi bi-people-fill"></i> الموظفون</a></li>
      <li class="nav-item"><a class="nav-link" href="#" id="adminChangeSelfPass"><i class="bi bi-key"></i> تغيير كلمة سري</a></li>
      <li class="nav-item"><a class="nav-link text-danger" href="#" id="logoutTop"><i class="bi bi-box-arrow-right"></i> خروج</a></li>
    `;
    document.getElementById('navInboxTop').onclick = () => renderAdminDashboard('inbox');
    document.getElementById('navSendTop').onclick = () => renderAdminDashboard('send');
    document.getElementById('navUsersTop').onclick = () => renderAdminDashboard('users');
    document.getElementById('logoutTop').onclick = logout;
    document.getElementById('adminChangeSelfPass').onclick = showAdminSelfPass;
  } else {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link text-danger" href="#" id="logoutTop"><i class="bi bi-box-arrow-right"></i> خروج</a></li>
    `;
    document.getElementById('logoutTop').onclick = logout;
  }
  nav.classList.remove('d-none');
}
function hideNavbar() {
  const nav = document.getElementById('top-navbar');
  if (nav) nav.classList.add('d-none');
}
function showAlert(msg) { window.alert(msg); }
function logout() {
  token = null; user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  hideNavbar(); renderLogin();
}

// ---------- Auth & Route ----------
function renderLogin() {
  hideNavbar();
  render(`
    <div class="auth-wrapper">
      <img src="logo.png" width="82" class="mb-2" style="opacity:.95">
      <h1>Creative Group</h1>
      <h2>تسجيل الدخول</h2>
      <form id="loginForm">
        <input required type="text" placeholder="اسم المستخدم" name="username" />
        <input required type="password" placeholder="كلمة المرور" name="password" />
        <button type="submit">دخول</button>
      </form>
      <p style="text-align:center">ليس لديك حساب؟ <a href="#" id="toSignup">سجل الآن</a></p>
    </div>
  `);
  document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = { username: fd.get('username'), password: fd.get('password') };
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if(data.token){
      token = data.token;
      user = data.user;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      route();
    }else{
      showAlert(data.msg || "خطأ");
    }
  };
  document.getElementById('toSignup').onclick = (e) => { e.preventDefault(); renderSignup(); }
}

function renderSignup() {
  hideNavbar();
  render(`
    <div class="auth-wrapper">
      <img src="logo.png" width="82" class="mb-2" style="opacity:.95">
      <h1>Creative Group</h1>
      <h2>تسجيل موظف جديد</h2>
      <form id="signupForm">
        <input required type="text" placeholder="اسم المستخدم" name="username" />
        <input required type="password" placeholder="كلمة المرور" name="password" id="passField"/>
        <div id="passStrength" class="pass-strength weak mb-1"></div>
        <input required type="text" placeholder="رقم الموبايل المصري" name="phonenumber" id="phoneField" maxlength="11"/>
        <div class="form-helper text-danger" id="phoneMsg"></div>
        <button type="submit">تسجيل</button>
      </form>
      <p style="text-align:center">لديك حساب؟ <a href="#" id="toLogin">دخول</a></p>
    </div>
  `);
  // تحقق من رقم الموبايل مصري (01XXXXXXXXX)
  const phoneField = document.getElementById('phoneField');
  const phoneMsg = document.getElementById('phoneMsg');
  phoneField.addEventListener('input', function(){
    if(!/^01[0-9]{9}$/.test(phoneField.value)) {
      phoneMsg.textContent = 'رقم الموبايل غير صحيح أو غير مصري!';
    } else {
      phoneMsg.textContent = '';
    }
  });
  // تحقق قوة الباسورد
  document.getElementById('passField').addEventListener('input', function(){
    const str = passwordStrength(this.value);
    const pStr = document.getElementById('passStrength');
    pStr.textContent = str.label;
    pStr.className = `pass-strength ${str.class}`;
  });
  // OTP وهمي (يظهر في alert فقط)
  document.getElementById('signupForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const username = fd.get('username');
    const password = fd.get('password');
    const phonenumber = fd.get('phonenumber');
    if(!/^01[0-9]{9}$/.test(phonenumber)){
      phoneMsg.textContent = 'رقم الموبايل غير صحيح أو غير مصري!';
      return;
    }
    if(!passwordStrength(password).ok){
      showAlert('يجب أن تكون كلمة المرور قوية (8 أحرف على الأقل، حرف كبير، صغير، رقم، رمز)');
      return;
    }
    // توليد كود OTP عشوائي
    const OTP = (''+Math.floor(Math.random()*9000+1000));
    window.sessionStorage.setItem('reg_otp', OTP);
    window.sessionStorage.setItem('reg_data', JSON.stringify({username, password, phonenumber}));
    showAlert('تم إرسال كود التحقق (اختبار): ' + OTP);
    renderOtpVerification();
  };
  document.getElementById('toLogin').onclick = (e) => { e.preventDefault(); renderLogin(); }
}

// صفحة إدخال OTP بعد التسجيل
function renderOtpVerification() {
  render(`
    <div class="auth-wrapper">
      <img src="logo.png" width="82" class="mb-2" style="opacity:.95">
      <h1>Creative Group</h1>
      <h2>أدخل كود التحقق</h2>
      <form id="otpForm">
        <input required type="text" maxlength="4" pattern="[0-9]{4}" placeholder="أدخل الكود من الرسالة" name="otp" />
        <button type="submit">تأكيد التسجيل</button>
      </form>
    </div>
  `);
  document.getElementById('otpForm').onsubmit = async function(e){
    e.preventDefault();
    const code = e.target.otp.value;
    const otp = window.sessionStorage.getItem('reg_otp');
    const regData = JSON.parse(window.sessionStorage.getItem('reg_data') || '{}');
    if(code !== otp){
      showAlert('كود التحقق غير صحيح!');
      return;
    }
    // سجل المستخدم في الباك اند فعلاً
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(regData)
    });
    const data = await res.json();
    if(data.msg && data.msg.includes("success")){
      window.sessionStorage.removeItem('reg_otp');
      window.sessionStorage.removeItem('reg_data');
      showAlert('تم التسجيل بنجاح! سجل دخولك الآن');
      renderLogin();
    }else{
      showAlert(data.msg || "خطأ");
    }
  }
}

// قوة كلمة المرور
function passwordStrength(pass) {
  let ok = false, label = 'ضعيفة', css='weak';
  if(pass.length < 8) return {ok:false, label:"ضعيفة - أقل من 8 أحرف", class:"weak"};
  const hasUpper = /[A-Z]/.test(pass);
  const hasLower = /[a-z]/.test(pass);
  const hasNum   = /[0-9]/.test(pass);
  const hasSym   = /[!@#$%^&*()_+{}\[\]:;"'<>,.?~\\/-]/.test(pass);
  if(hasUpper && hasLower && hasNum && hasSym){
    ok=true; label="قوية جدًا"; css='strong';
  } else if((hasUpper||hasLower)&&hasNum&&(hasSym||hasUpper||hasLower)){
    ok=true; label="جيدة"; css='good';
  }
  return {ok, label, class:css};
}

// ---------- Routing ----------
function route() {
  if (!token || !user) return renderLogin();
  setupNavbar();
  if (user.role === 'admin') return renderAdminDashboard();
  renderUserDashboard();
}

/* --------- ADMIN DASHBOARD --------- */
async function renderAdminDashboard(selectedSection = "inbox", selectedUserId = null) {
  setupNavbar();
  render(`<div class="container py-4"><div id="adminMain">جاري التحميل...</div></div>`);
  if(selectedSection === "inbox") loadAdminInbox(selectedUserId);
  if(selectedSection === "send") loadAdminSend();
  if(selectedSection === "users") loadAdminUsers();
}

// رسائل الموظفين - انبوكس الأدمن
async function loadAdminInbox(selectedUserId = null) {
  const res = await fetch(`${API}/admin/users`, {headers: {Authorization: `Bearer ${token}`}});
  const users = await res.json();
  let usersList = '';
  users.forEach(u => {
    usersList += `<a href="#" class="list-group-item list-group-item-action ${selectedUserId===u._id?'active':''}" data-uid="${u._id}">
      ${u.username}
    </a>`;
  });
  let html = `
    <div class="row">
      <div class="col-12 col-md-4 col-lg-3 mb-3">
        <div class="card"><div class="card-body p-2">
        <div class="list-group">${usersList||'<div class="text-center text-muted my-2">لا يوجد موظفين</div>'}</div>
        </div></div>
      </div>
      <div class="col-12 col-md-8 col-lg-9">
        <div id="adminConvSection" class="py-1"></div>
      </div>
    </div>
  `;
  document.getElementById('adminMain').innerHTML = html;
  document.querySelectorAll('.list-group-item[data-uid]').forEach(el => {
    el.onclick = (e) => {
      e.preventDefault();
      loadConversationWithUser(el.getAttribute('data-uid'));
      document.querySelectorAll('.list-group-item').forEach(x=>x.classList.remove('active'));
      el.classList.add('active');
    }
  });
  if(selectedUserId) loadConversationWithUser(selectedUserId);
}

// محادثة مع موظف
async function loadConversationWithUser(userId) {
  document.getElementById('adminConvSection').innerHTML = `<div class="text-center py-4">جاري التحميل...</div>`;
  const res = await fetch(`${API}/messages/admin/conversation/${userId}`, {headers: {Authorization: `Bearer ${token}`}});
  const messages = await res.json();
  let html = '';
  messages.forEach(msg => {
    const isAdmin = (msg.from && msg.from.username === 'admin');
    html += `
      <div class="msg-card ${isAdmin ? "admin-msg" : "user-msg"}">
        <div class="msg-meta">
          <span class="badge ${isAdmin ? 'bg-success' : 'bg-primary'}">${isAdmin ? "المدير" : msg.from.username}</span>
          <span>${new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <div class="msg-content">${msg.content}</div>
        ${msg.replyTo ? `<div class="reply-ref">رد على: "${msg.replyTo.content}"</div>` : ""}
        <div>
          ${(!isAdmin && !msg.replyTo) ? `<button class="btn btn-outline-primary btn-sm" onclick="showReplyBox('${msg._id}','${userId}')">رد</button>` : ""}
          <button class="btn btn-outline-danger btn-sm btn-delete-msg" data-msgid="${msg._id}" data-userid="${userId}">
            <i class="bi bi-trash"></i> حذف
          </button>
        </div>
      </div>
    `;
  });
  html += `<div id="replyBoxContainer"></div>`;
  document.getElementById('adminConvSection').innerHTML = html;

  document.querySelectorAll('.btn-delete-msg').forEach(btn => {
    btn.onclick = function() {
      const msgId = btn.getAttribute('data-msgid');
      const userId = btn.getAttribute('data-userid');
      if (!confirm('هل أنت متأكد من حذف هذه الرسالة؟')) return;
      fetch(`${API}/messages/admin/message/${msgId}`, {
        method: "DELETE",
        headers: {'Authorization': `Bearer ${token}`}
      }).then(() => {
        showAlert('تم حذف الرسالة');
        loadConversationWithUser(userId);
      });
    }
  });
}

// اظهار صندوق الرد للمدير
window.showReplyBox = function(msgId, userId){
  document.getElementById('replyBoxContainer').innerHTML = `
    <form id="replyForm" class="mt-2 d-flex gap-2">
      <input type="text" class="form-control" required placeholder="اكتب الرد..." name="replyMsg" />
      <button type="submit" class="btn btn-success">إرسال الرد</button>
    </form>
  `;
  document.getElementById('replyForm').onsubmit = async function(e){
    e.preventDefault();
    const content = this.replyMsg.value;
    await fetch(`${API}/messages/admin/send`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({to:userId, content, replyTo:msgId})
    });
    showAlert('تم إرسال الرد');
    loadConversationWithUser(userId);
  }
}

// صفحة إرسال رسالة من الأدمن لموظف
async function loadAdminSend() {
  const res = await fetch(`${API}/admin/users`, {headers: {Authorization: `Bearer ${token}`}});
  const users = await res.json();
  let html = `
    <div class="card mx-auto" style="max-width:400px">
      <div class="card-body">
        <h5 class="mb-3">إرسال رسالة لموظف</h5>
        <form id="adminSendForm">
          <select required name="to" class="form-select mb-2">
            <option value="">اختر الموظف</option>
            ${users.map(u=>`<option value="${u._id}">${u.username}</option>`).join('')}
          </select>
          <textarea required name="content" class="form-control mb-2" placeholder="محتوى الرسالة"></textarea>
          <button type="submit" class="btn btn-primary">إرسال</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('adminMain').innerHTML = html;
  document.getElementById('adminSendForm').onsubmit = async function(e){
    e.preventDefault();
    const fd = new FormData(this);
    await fetch(`${API}/messages/admin/send`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({to:fd.get('to'), content:fd.get('content')})
    });
    showAlert('تم الإرسال');
    renderAdminDashboard('send');
  }
}

// صفحة إدارة الموظفين
async function loadAdminUsers() {
  const res = await fetch(`${API}/admin/users`, {headers: {Authorization: `Bearer ${token}`}});
  const users = await res.json();
  let html = `<div class="row">`;
  users.forEach(u => {
    html += `
      <div class="col-12 col-sm-6 col-lg-4 mb-3">
        <div class="user-card card d-flex flex-column align-items-center p-2">
          <div class="fw-bold fs-5 mb-1">${u.username}</div>
          <div class="text-muted mb-1">${u.phonenumber}</div>
          <button class="btn btn-outline-secondary btn-sm mb-1" onclick="showChangePass('${u._id}','${u.username}')"><i class="bi bi-key"></i> تغيير كلمة السر</button>
          <button class="btn btn-outline-danger btn-sm btn-delete-user" data-uid="${u._id}"><i class="bi bi-trash"></i> حذف</button>
        </div>
      </div>
    `;
  });
  html += `</div>
    <div class="card mx-auto" style="max-width:400px">
      <div class="card-body">
        <h5 class="mb-3">إضافة موظف جديد</h5>
        <form id="addUserForm">
          <input required type="text" class="form-control mb-2" placeholder="اسم المستخدم" name="username"/>
          <input required type="password" class="form-control mb-2" placeholder="كلمة المرور" name="password" id="passAdd"/>
          <div id="addPassStrength" class="pass-strength weak mb-2"></div>
          <input required type="text" class="form-control mb-2" placeholder="رقم الموبايل المصري" name="phonenumber" id="phoneAdd"/>
          <div class="form-helper text-danger" id="phoneAddMsg"></div>
          <button type="submit" class="btn btn-primary">إضافة</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('adminMain').innerHTML = html;
  // حذف موظف
  document.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.onclick = function() {
      const uid = btn.getAttribute('data-uid');
      if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
      fetch(`${API}/admin/user/${uid}`, {
        method: "DELETE",
        headers: {'Authorization': `Bearer ${token}`}
      }).then(() => {
        showAlert('تم حذف الموظف');
        loadAdminUsers();
      });
    }
  });
  // قوة الباسورد في إضافة موظف
  document.getElementById('passAdd').addEventListener('input', function(){
    const str = passwordStrength(this.value);
    const pStr = document.getElementById('addPassStrength');
    pStr.textContent = str.label;
    pStr.className = `pass-strength ${str.class}`;
  });
  // تحقق رقم موبايل موظف
  const phoneAdd = document.getElementById('phoneAdd');
  const phoneAddMsg = document.getElementById('phoneAddMsg');
  phoneAdd.addEventListener('input', function(){
    if(!/^01[0-9]{9}$/.test(phoneAdd.value)) {
      phoneAddMsg.textContent = 'رقم الموبايل غير صحيح أو غير مصري!';
    } else {
      phoneAddMsg.textContent = '';
    }
  });
  // إضافة موظف جديد
  document.getElementById('addUserForm').onsubmit = async function(e){
    e.preventDefault();
    const fd = new FormData(this);
    if(!/^01[0-9]{9}$/.test(fd.get('phonenumber'))){
      phoneAddMsg.textContent = 'رقم الموبايل غير صحيح أو غير مصري!';
      return;
    }
    if(!passwordStrength(fd.get('password')).ok){
      showAlert('كلمة المرور ضعيفة!');
      return;
    }
    const res = await fetch(`${API}/admin/adduser`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({
        username:fd.get('username'),
        password:fd.get('password'),
        phonenumber:fd.get('phonenumber')
      })
    });
    const data = await res.json();
    showAlert(data.msg || "تمت الإضافة");
    loadAdminUsers();
  }
}

/* --------- ميزة تغيير كلمة السر لأي موظف --------- */
window.showChangePass = function(userid, username) {
  let oldModal = document.getElementById('changePassModal');
  if(oldModal) oldModal.remove();

  const modalHtml = `
    <div class="modal fade" id="changePassModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content p-3">
          <h5 class="mb-2">تغيير كلمة السر للموظف: ${username}</h5>
          <form id="changePassForm">
            <input type="password" class="form-control mb-2" placeholder="كلمة السر الجديدة" name="newpass" required/>
            <button type="submit" class="btn btn-primary w-100">تغيير</button>
          </form>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('changePassModal'));
  modal.show();

  document.getElementById('changePassForm').onsubmit = async function(e){
    e.preventDefault();
    const newpass = this.newpass.value;
    const res = await fetch(`${API}/admin/changepass`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({userid, newpass})
    });
    const data = await res.json();
    showAlert(data.msg);
    modal.hide();
    document.getElementById('changePassModal').remove();
  }
}

/* --------- ميزة تغيير كلمة سر الأدمن لنفسه --------- */
function showAdminSelfPass() {
  let oldModal = document.getElementById('selfPassModal');
  if(oldModal) oldModal.remove();

  const modalHtml = `
    <div class="modal fade" id="selfPassModal" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content p-3">
          <h5 class="mb-2">تغيير كلمة السر الخاصة بك</h5>
          <form id="selfPassForm">
            <input type="password" class="form-control mb-2" placeholder="كلمة السر الحالية" name="oldpass" required/>
            <input type="password" class="form-control mb-2" placeholder="كلمة السر الجديدة" name="newpass" required/>
            <button type="submit" class="btn btn-primary w-100">تغيير</button>
          </form>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  const modal = new bootstrap.Modal(document.getElementById('selfPassModal'));
  modal.show();

  document.getElementById('selfPassForm').onsubmit = async function(e){
    e.preventDefault();
    const oldpass = this.oldpass.value;
    const newpass = this.newpass.value;
    const res = await fetch(`${API}/admin/selfpass`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({oldpass, newpass})
    });
    const data = await res.json();
    showAlert(data.msg);
    modal.hide();
    document.getElementById('selfPassModal').remove();
  }
}

/* --------- USER DASHBOARD --------- */
async function renderUserDashboard() {
  setupNavbar();
  render(`
    <div class="container py-4">
      <div class="card mx-auto mb-4" style="max-width:420px">
        <div class="card-body text-center">
          <div class="fw-bold fs-4 mb-1">مرحباً ${user.username}</div>
          <button class="btn btn-outline-danger mb-2" onclick="logout()">تسجيل خروج</button>
          <form id="userMsgForm" class="my-2">
            <textarea required class="form-control mb-2" placeholder="اكتب رسالتك للمدير" name="content"></textarea>
            <button class="btn btn-primary w-100" type="submit">إرسال</button>
          </form>
        </div>
      </div>
      <div class="card mx-auto" style="max-width:600px">
        <div class="card-header fw-bold">المحادثة مع المدير</div>
        <div class="card-body" id="userConvBox">جاري التحميل...</div>
      </div>
    </div>
  `);
  document.getElementById('userMsgForm').onsubmit = async function(e){
    e.preventDefault();
    const fd = new FormData(this);
    await fetch(`${API}/messages/send`, {
      method:"POST",
      headers: {'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body: JSON.stringify({content:fd.get('content')})
    });
    showAlert('تم إرسال الرسالة');
    loadUserConversation();
  }
  loadUserConversation();
}

async function loadUserConversation() {
  const res = await fetch(`${API}/messages/user/conversation`, {
    headers: {'Authorization':`Bearer ${token}`}
  });
  const messages = await res.json();
  let html = '';
  messages.forEach(msg => {
    const isAdmin = (msg.from && msg.from.username === 'admin');
    html += `
      <div class="msg-card mb-2 ${isAdmin ? "admin-msg" : "user-msg"}">
        <div class="msg-meta">
          <span class="badge ${isAdmin ? 'bg-success' : 'bg-primary'}">${isAdmin ? "المدير" : user.username}</span>
          <span>${new Date(msg.createdAt).toLocaleString()}</span>
        </div>
        <div class="msg-content">${msg.content}</div>
        ${msg.replyTo ? `<div class="reply-ref">رد على: "${msg.replyTo.content}"</div>` : ""}
      </div>
    `;
  });
  document.getElementById('userConvBox').innerHTML = html || '<div class="text-muted py-3">لا توجد رسائل بعد</div>';
}

// Render Utility
function render(html) { app.innerHTML = html; }

// ---------- ابدأ التطبيق ----------
route();
