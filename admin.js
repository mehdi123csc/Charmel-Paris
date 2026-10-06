let sb = null;
let currentUser = null;
let services = [];
let gallery = [];
let bookings = [];

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init(){
  if(!window.CHARMEL_CONFIG ||
     !window.CHARMEL_CONFIG.SUPABASE_URL ||
     window.CHARMEL_CONFIG.SUPABASE_URL.includes("YOUR-PROJECT")){
    showLogin("ضعي بيانات Supabase في ملف supabase-config.js أولاً.");
    return;
  }

  sb = window.supabase.createClient(
    window.CHARMEL_CONFIG.SUPABASE_URL,
    window.CHARMEL_CONFIG.SUPABASE_ANON_KEY
  );

  bindUI();

  const { data:{ session } } = await sb.auth.getSession();
  if(session) await startApp(session.user);
  else showLogin();
}

function bindUI(){
  $("loginForm")?.addEventListener("submit", login);
  $("logoutBtn")?.addEventListener("click", logout);
  $("addServiceBtn")?.addEventListener("click", () => openServiceModal());
  $("addGalleryBtn")?.addEventListener("click", () => openGalleryModal());
  $("bookingFilter")?.addEventListener("change", renderBookings);

  document.querySelectorAll(".side-link").forEach(btn=>{
    btn.addEventListener("click",()=>showPage(btn.dataset.page));
  });

  document.querySelectorAll("[data-go]").forEach(btn=>{
    btn.addEventListener("click",()=>showPage(btn.dataset.go));
  });

  $("mobileSideBtn")?.addEventListener("click",()=>{
    $("sidebar")?.classList.toggle("open");
  });

  $("modalClose")?.addEventListener("click",closeModal);
  $("modal")?.addEventListener("click",e=>{
    if(e.target.id==="modal") closeModal();
  });
}

async function login(e){
  e.preventDefault();
  const email=$("loginEmail").value.trim();
  const password=$("loginPassword").value;
  setLoginMessage("جاري التحقق...");

  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){setLoginMessage(error.message);return;}

  await startApp(data.user);
}

async function startApp(user){
  currentUser=user;

  const {data:profile,error}=await sb
    .from("profiles")
    .select("role,full_name")
    .eq("id",user.id)
    .maybeSingle();

  if(error || !profile || profile.role!=="admin"){
    await sb.auth.signOut();
    showLogin("هذا الحساب ليس مديراً. أضيفيه إلى جدول profiles بدور admin.");
    return;
  }

  $("loginView").classList.add("hidden");
  $("appView").classList.remove("hidden");
  $("adminEmail").textContent=profile.full_name || user.email;

  await refreshAll();
}

function showLogin(message=""){
  $("loginView")?.classList.remove("hidden");
  $("appView")?.classList.add("hidden");
  setLoginMessage(message);
}

function setLoginMessage(message){
  if($("loginMessage")) $("loginMessage").textContent=message;
}

async function logout(){
  await sb.auth.signOut();
  location.reload();
}

function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active-page"));
  document.querySelector(`#page-${page}`)?.classList.add("active-page");

  document.querySelectorAll(".side-link").forEach(x=>{
    x.classList.toggle("active",x.dataset.page===page);
  });

  const titles={
    dashboard:"الرئيسية",
    services:"الخدمات والأسعار",
    gallery:"الصور",
    bookings:"الحجوزات",
    settings:"الإعدادات"
  };
  $("pageTitle").textContent=titles[page]||"الرئيسية";
  $("sidebar")?.classList.remove("open");
}

async function refreshAll(){
  await Promise.all([loadServices(),loadGallery(),loadBookings()]);
  updateStats();
  renderDashboardBookings();
}

async function loadServices(){
  const {data,error}=await sb.from("services")
    .select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error){alertError(error);return;}
  services=data||[];
  renderServices();
}

async function loadGallery(){
  const {data,error}=await sb.from("gallery")
    .select("*").order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error){alertError(error);return;}
  gallery=data||[];
  renderGallery();
}

async function loadBookings(){
  const {data,error}=await sb.from("bookings")
    .select("*").order("booking_date",{ascending:false}).order("booking_time",{ascending:false});
  if(error){alertError(error);return;}
  bookings=data||[];
  renderBookings();
}

function updateStats(){
  $("statServices").textContent=services.filter(x=>x.active).length;
  $("statGallery").textContent=gallery.filter(x=>x.active).length;
  $("statNewBookings").textContent=bookings.filter(x=>x.status==="new").length;
  $("statBookings").textContent=bookings.length;
}

function renderDashboardBookings(){
  const rows=bookings.slice(0,6);
  $("dashboardBookings").innerHTML=tableHtml(rows,false);
}

function renderBookings(){
  const filter=$("bookingFilter")?.value||"all";
  const rows=filter==="all"?bookings:bookings.filter(x=>x.status===filter);
  $("bookingsList").innerHTML=tableHtml(rows,true);
}

function tableHtml(rows,actions){
  if(!rows.length) return `<div class="muted">لا توجد حجوزات حالياً.</div>`;

  return `<table class="table">
    <thead><tr>
      <th>العميلة</th><th>الخدمة</th><th>التاريخ</th><th>الوقت</th><th>الهاتف</th><th>الحالة</th>${actions?"<th></th>":""}
    </tr></thead>
    <tbody>
    ${rows.map(b=>`
      <tr>
        <td><strong>${esc(b.name)}</strong></td>
        <td>${esc(b.service_name)}</td>
        <td>${esc(b.booking_date)}</td>
        <td>${esc(String(b.booking_time).slice(0,5))}</td>
        <td><a href="tel:${escAttr(b.phone)}">${esc(b.phone)}</a></td>
        <td>
          ${actions ? `<select class="status-select" onchange="changeBookingStatus('${b.id}',this.value)">
            ${statusOption("new",b.status,"جديد")}
            ${statusOption("confirmed",b.status,"مؤكد")}
            ${statusOption("completed",b.status,"مكتمل")}
            ${statusOption("cancelled",b.status,"ملغي")}
          </select>` : `<span class="badge ${b.status==="cancelled"?"off":""}">${statusLabel(b.status)}</span>`}
        </td>
        ${actions?`<td><button class="row-btn danger" onclick="deleteBooking('${b.id}')">حذف</button></td>`:""}
      </tr>
    `).join("")}
    </tbody>
  </table>`;
}

function statusOption(value,current,label){
  return `<option value="${value}" ${value===current?"selected":""}>${label}</option>`;
}
function statusLabel(s){
  return {new:"جديد",confirmed:"مؤكد",completed:"مكتمل",cancelled:"ملغي"}[s]||s;
}

function renderServices(){
  $("servicesList").innerHTML=services.length?services.map(s=>`
    <div class="service-row">
      <div>
        <h4>${esc(s.name)} ${s.active?'<span class="badge">نشطة</span>':'<span class="badge off">مخفية</span>'}</h4>
        <p>${esc(s.description||"")}</p>
        <div class="row-actions">
          <span class="price">${s.price==null?"بدون سعر":esc(String(s.price))+" "+esc(s.currency||"QAR")}</span>
          <button class="row-btn" onclick="openServiceModal('${s.id}')">تعديل</button>
          <button class="row-btn" onclick="toggleService('${s.id}',${!s.active})">${s.active?"إخفاء":"إظهار"}</button>
          <button class="row-btn danger" onclick="deleteService('${s.id}')">حذف</button>
        </div>
      </div>
    </div>
  `).join(""):`<div class="muted">لا توجد خدمات.</div>`;
}

function renderGallery(){
  $("galleryList").innerHTML=gallery.length?gallery.map(g=>`
    <div class="gallery-card">
      <img src="${escAttr(g.image_url)}" alt="${escAttr(g.title||"Charmel Paris")}" onerror="this.style.opacity=.25">
      <div class="gallery-card-body">
        <strong>${esc(g.title||"بدون عنوان")}</strong>
        <p>${esc(g.image_url)}</p>
        <div class="row-actions">
          <button class="row-btn" onclick="openGalleryModal('${g.id}')">تعديل</button>
          <button class="row-btn" onclick="toggleGallery('${g.id}',${!g.active})">${g.active?"إخفاء":"إظهار"}</button>
          <button class="row-btn danger" onclick="deleteGallery('${g.id}')">حذف</button>
        </div>
      </div>
    </div>
  `).join(""):`<div class="muted">لا توجد صور.</div>`;
}

function openServiceModal(id=null){
  const item=services.find(x=>x.id===id);
  $("modalTitle").textContent=id?"تعديل الخدمة":"إضافة خدمة";
  $("modalForm").innerHTML=`
    <label>اسم الخدمة<input id="mName" value="${escAttr(item?.name||"")}" required></label>
    <label>الوصف<textarea id="mDesc" rows="4">${esc(item?.description||"")}</textarea></label>
    <label>السعر<input id="mPrice" type="number" min="0" step="0.01" value="${item?.price??""}"></label>
    <label>العملة<select id="mCurrency"><option ${item?.currency==="QAR"||!item?"selected":""}>QAR</option><option ${item?.currency==="DZD"?"selected":""}>DZD</option><option ${item?.currency==="USD"?"selected":""}>USD</option></select></label>
    <label>ترتيب الظهور<input id="mOrder" type="number" value="${item?.sort_order??services.length+1}"></label>
    <label>رابط صورة الخدمة<input id="mImage" value="${escAttr(item?.image_url||"")}" placeholder="https://..."></label>
    <label><input id="mActive" type="checkbox" ${item?.active!==false?"checked":""}> ظاهرة في الموقع</label>
    <div class="modal-actions"><button class="primary" type="submit">حفظ</button><button type="button" class="row-btn" onclick="closeModal()">إلغاء</button></div>`;
  $("modalForm").onsubmit=e=>saveService(e,id);
  $("modal").classList.remove("hidden");
}

async function saveService(e,id){
  e.preventDefault();
  const payload={
    name:$("mName").value.trim(),
    description:$("mDesc").value.trim(),
    price:$("mPrice").value===""?null:Number($("mPrice").value),
    currency:$("mCurrency").value,
    sort_order:Number($("mOrder").value||0),
    image_url:$("mImage").value.trim(),
    active:$("mActive").checked
  };
  const result=id
    ? await sb.from("services").update(payload).eq("id",id)
    : await sb.from("services").insert(payload);
  if(result.error){alertError(result.error);return;}
  closeModal();await loadServices();updateStats();
}

async function toggleService(id,value){
  const {error}=await sb.from("services").update({active:value}).eq("id",id);
  if(error){alertError(error);return}
  await loadServices();updateStats();
}

async function deleteService(id){
  if(!confirm("حذف هذه الخدمة نهائياً؟"))return;
  const {error}=await sb.from("services").delete().eq("id",id);
  if(error){alertError(error);return}
  await loadServices();updateStats();
}

function openGalleryModal(id=null){
  const item=gallery.find(x=>x.id===id);
  $("modalTitle").textContent=id?"تعديل الصورة":"إضافة صورة";
  $("modalForm").innerHTML=`
    <label>عنوان الصورة
      <input id="gTitle" value="${escAttr(item?.title||"")}" maxlength="120">
    </label>

    <div class="upload-box">
      <label class="upload-label" for="gFile">
        <span class="upload-icon">＋</span>
        <strong>${id ? "اختيار صورة جديدة من الهاتف" : "اختيار صورة من الهاتف"}</strong>
        <small>JPG / PNG / WEBP — الحد الأقصى 8MB</small>
      </label>
      <input id="gFile" type="file" accept="image/jpeg,image/png,image/webp" hidden>
      <div id="gPreview" class="upload-preview ${item?.image_url ? "" : "empty"}">
        ${item?.image_url ? `<img src="${escAttr(item.image_url)}" alt="preview">` : `<span>لا توجد صورة مختارة</span>`}
      </div>
    </div>

    <label>أو رابط صورة موجود (اختياري)
      <input id="gUrl" type="url" value="${escAttr(item?.image_url||"")}" placeholder="يمكن تركه فارغاً عند رفع صورة">
    </label>

    <label>ترتيب الظهور
      <input id="gOrder" type="number" value="${item?.sort_order??gallery.length+1}">
    </label>

    <label>
      <input id="gActive" type="checkbox" ${item?.active!==false?"checked":""}>
      ظاهرة في الموقع
    </label>

    <div id="uploadProgress" class="upload-progress"></div>

    <div class="modal-actions">
      <button class="primary" type="submit">حفظ</button>
      <button type="button" class="row-btn" onclick="closeModal()">إلغاء</button>
    </div>`;

  $("gFile").addEventListener("change", previewGalleryFile);
  $("modalForm").onsubmit=e=>saveGallery(e,id);
  $("modal").classList.remove("hidden");
}

function previewGalleryFile(e){
  const file=e.target.files?.[0];
  if(!file) return;

  if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
    e.target.value="";
    alert("اختاري JPG أو PNG أو WEBP فقط.");
    return;
  }

  if(file.size > 8*1024*1024){
    e.target.value="";
    alert("حجم الصورة أكبر من 8MB.");
    return;
  }

  const url=URL.createObjectURL(file);
  $("gPreview").classList.remove("empty");
  $("gPreview").innerHTML=`<img src="${url}" alt="preview">`;
}

async function saveGallery(e,id){
  e.preventDefault();

  const file=$("gFile").files?.[0] || null;
  let imageUrl=$("gUrl").value.trim();

  if(!file && !imageUrl){
    alert("اختاري صورة من الهاتف أو ضعي رابط صورة.");
    return;
  }

  try{
    if(file){
      imageUrl=await uploadSalonImage(file);
    }

    const payload={
      title:$("gTitle").value.trim(),
      image_url:imageUrl,
      sort_order:Number($("gOrder").value||0),
      active:$("gActive").checked
    };

    setUploadProgress("جاري حفظ الصورة...");

    const result=id
      ? await sb.from("gallery").update(payload).eq("id",id)
      : await sb.from("gallery").insert(payload);

    if(result.error) throw result.error;

    closeModal();
    await loadGallery();
    updateStats();
  }catch(error){
    console.error(error);
    setUploadProgress("");
    alertError(error);
  }
}

async function uploadSalonImage(file){
  const extension=(file.name.split(".").pop()||"jpg").toLowerCase();
  const safeExt=["jpg","jpeg","png","webp"].includes(extension) ? extension : "jpg";
  const path=`gallery/${crypto.randomUUID()}.${safeExt}`;

  setUploadProgress("جاري رفع الصورة...");

  const {error:uploadError}=await sb.storage
    .from("salon-images")
    .upload(path,file,{
      cacheControl:"31536000",
      upsert:false,
      contentType:file.type
    });

  if(uploadError) throw uploadError;

  const {data}=sb.storage.from("salon-images").getPublicUrl(path);
  if(!data?.publicUrl) throw new Error("تعذر إنشاء رابط الصورة.");

  return data.publicUrl;
}

function setUploadProgress(text){
  const el=$("uploadProgress");
  if(el) el.textContent=text||"";
}

async function toggleGallery(id,value){
  const {error}=await sb.from("gallery").update({active:value}).eq("id",id);
  if(error){alertError(error);return}
  await loadGallery();updateStats();
}

async function deleteGallery(id){
  if(!confirm("حذف الصورة نهائياً؟"))return;
  const {error}=await sb.from("gallery").delete().eq("id",id);
  if(error){alertError(error);return}
  await loadGallery();updateStats();
}

async function changeBookingStatus(id,status){
  const {error}=await sb.from("bookings").update({status}).eq("id",id);
  if(error){alertError(error);return}
  await loadBookings();updateStats();renderDashboardBookings();
}

async function deleteBooking(id){
  if(!confirm("حذف الحجز نهائياً؟"))return;
  const {error}=await sb.from("bookings").delete().eq("id",id);
  if(error){alertError(error);return}
  await loadBookings();updateStats();renderDashboardBookings();
}

function closeModal(){$("modal").classList.add("hidden");$("modalForm").innerHTML=""}
function alertError(error){console.error(error);alert("حدث خطأ: "+(error.message||"تحقق من Supabase."))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escAttr(v){return esc(v)}
