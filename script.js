(() => {
  "use strict";

  const cfg = window.CHARMEL_CONFIG || {};
  const sb = window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
    : null;

  const menuBtn=document.getElementById("menuBtn");
  const nav=document.getElementById("nav");
  if(menuBtn&&nav){
    menuBtn.addEventListener("click",()=>nav.classList.toggle("open"));
    nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
  }

  const header=document.getElementById("header");
  window.addEventListener("scroll",()=>{
    if(header) header.style.background=scrollY>55?"rgba(5,5,5,.96)":"rgba(8,8,7,.45)";
  });

  const year=document.getElementById("year");
  if(year) year.textContent=new Date().getFullYear();

  const dateInput=document.getElementById("date");
  if(dateInput) dateInput.min=new Date().toISOString().split("T")[0];

  const WA="97444881336";
  const serviceSelect=document.getElementById("service");
  const servicesGrid=document.querySelector(".services-grid");
  const galleryGrid=document.querySelector(".gallery-grid");

  function esc(v){
    return String(v ?? "").replace(/[&<>\"']/g,c=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"
    }[c]));
  }

  function money(v){
    const n=Number(v||0);
    return n>0 ? `${n.toLocaleString("ar-QA")} QAR` : "السعر حسب الخدمة";
  }

  function serviceFallback(){
    return [
      {name:"Hair",category:"Hair",description:"قص، لون، تصفيف وعلاجات شعر باحترافية.",price:0,sort_order:1},
      {name:"Makeup",category:"Beauty",description:"إطلالات ناعمة، مناسبات وسهرات بلمسة فنية.",price:0,sort_order:2},
      {name:"Nails",category:"Beauty",description:"عناية، مانيكير، باديكير وتصاميم أنيقة.",price:0,sort_order:3},
      {name:"Beauty",category:"Beauty",description:"رموش، حواجب وعناية تمنحكِ إطلالة متكاملة.",price:0,sort_order:4}
    ];
  }

  async function loadServices(){
    if(!servicesGrid) return;
    let list=serviceFallback();
    if(sb){
      const r=await sb.from("services").select("id,name,category,description,price,duration_minutes,sort_order").eq("active",true).order("sort_order",{ascending:true});
      if(!r.error && Array.isArray(r.data) && r.data.length) list=r.data;
    }

    servicesGrid.innerHTML=list.map((s,i)=>`\
      <article class="service reveal">\
        <div class="service-photo"><img src="${[
          "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1000&q=90",
          "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=90",
          "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1000&q=90",
          "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1000&q=90"
        ][i%4]}" alt="${esc(s.name)}"></div>\
        <div class="service-body"><span>${String(i+1).padStart(2,"0")}</span><h3>${esc(s.name)}</h3><p>${esc(s.description||"")}</p>${Number(s.price||0)>0?`<small class="service-price">${money(s.price)}</small>`:""}<a href="#booking">احجزي ↗</a></div>\
      </article>`).join("");

    if(serviceSelect){
      serviceSelect.innerHTML='<option value="">اختاري الخدمة</option>'+list.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}${Number(s.price||0)>0?` — ${money(s.price)}`:""}</option>`).join("");
    }
    observeReveals();
  }

  const fallbackGallery=[
    ["https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1000&q=90","مكياج فاخر"],
    ["https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=90","شعر"],
    ["https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=90","أظافر"],
    ["https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=90","أظافر وعناية"],
    ["https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=900&q=90","تصفيف"]
  ];

  async function loadGallery(){
    if(!galleryGrid) return;
    let list=null;
    if(sb){
      const r=await sb.from("gallery").select("id,image_url,title,sort_order").eq("active",true).order("sort_order",{ascending:true});
      if(!r.error && Array.isArray(r.data) && r.data.length) list=r.data;
    }
    const items=list || fallbackGallery.map((x,i)=>({image_url:x[0],title:x[1],sort_order:i}));
    galleryGrid.innerHTML=items.map((g,i)=>`<div class="gallery-card ${i===0?"tall":""} reveal"><img src="${esc(g.image_url)}" alt="${esc(g.title||"Charmel Paris")}" loading="lazy"></div>`).join("");
    observeReveals();
  }

  const form=document.getElementById("bookingForm");
  const status=document.getElementById("formStatus");

  if(form){
    form.addEventListener("submit",async(e)=>{
      e.preventDefault();
      const name=document.getElementById("name").value.trim();
      const phone=document.getElementById("phone").value.trim();
      const service=document.getElementById("service").value;
      const date=document.getElementById("date").value;
      const time=document.getElementById("time").value;
      const message=document.getElementById("message").value.trim();

      if(!name||!phone||!service||!date||!time){
        status.textContent="يرجى إكمال الحقول المطلوبة.";
        return;
      }

      const pretty=new Date(date+"T00:00:00").toLocaleDateString("ar-QA",{year:"numeric",month:"long",day:"numeric"});
      status.textContent="جاري حفظ طلب الحجز...";

      let saved=false;
      if(sb){
        const r=await sb.from("bookings").insert({
          customer_name:name,
          phone,
          service_name:service,
          booking_date:date,
          booking_time:time,
          notes:message || null,
          status:"pending"
        });
        if(!r.error) saved=true;
        else console.error("Supabase booking error:",r.error);
      }

      const lines=[
        "مرحباً Charmel Paris ✨","","أرغب في حجز موعد.","",
        `الاسم: ${name}`,`الهاتف: ${phone}`,`الخدمة: ${service}`,
        `التاريخ: ${pretty}`,`الوقت: ${time}`,message?`الملاحظات: ${message}`:"",
        "","يرجى تأكيد الموعد."
      ].filter(Boolean).join("\n");

      status.textContent=saved
        ? "تم حفظ طلبك. سيتم فتح WhatsApp لإرسال تفاصيل الحجز."
        : "سيتم فتح WhatsApp لإرسال طلب الحجز...";

      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines)}`,"_blank","noopener,noreferrer");
      form.reset();
      if(dateInput) dateInput.min=new Date().toISOString().split("T")[0];
    });
  }

  let observer;
  function observeReveals(){
    if(!observer){
      observer=new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){entry.target.classList.add("show");observer.unobserve(entry.target);}
        });
      },{threshold:.12});
    }
    document.querySelectorAll(".reveal:not(.show)").forEach(el=>observer.observe(el));
  }
  observeReveals();

  const sections=[...document.querySelectorAll("main section[id]")];
  const links=[...document.querySelectorAll(".nav a:not(.nav-button)")];
  window.addEventListener("scroll",()=>{
    let current="home";
    sections.forEach(section=>{if(scrollY>=section.offsetTop-190) current=section.id;});
    links.forEach(link=>link.classList.toggle("active",link.getAttribute("href")==="#"+current));
  });

  loadServices();
  loadGallery();
})();
