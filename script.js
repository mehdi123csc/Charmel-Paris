const menuBtn=document.getElementById("menuBtn");
const nav=document.getElementById("nav");
if(menuBtn&&nav){
  menuBtn.addEventListener("click",()=>nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
}
const header=document.getElementById("header");
window.addEventListener("scroll",()=>{
  if(!header)return;
  header.style.background=window.scrollY>60?"rgba(5,5,5,.96)":"rgba(7,7,7,.68)";
});
const year=document.getElementById("year"); if(year)year.textContent=new Date().getFullYear();

const dateInput=document.getElementById("date");
if(dateInput) dateInput.min=new Date().toISOString().split("T")[0];

const form=document.getElementById("bookingForm");
const status=document.getElementById("formStatus");
const WA="97444881336";
if(form){
  form.addEventListener("submit",e=>{
    e.preventDefault();
    const name=document.getElementById("name").value.trim();
    const phone=document.getElementById("phone").value.trim();
    const service=document.getElementById("service").value;
    const date=document.getElementById("date").value;
    const time=document.getElementById("time").value;
    const message=document.getElementById("message").value.trim();
    if(!name||!phone||!service||!date||!time){status.textContent="يرجى إكمال الحقول المطلوبة.";return;}
    const pretty=new Date(date+"T00:00:00").toLocaleDateString("ar-QA",{year:"numeric",month:"long",day:"numeric"});
    const text=`مرحباً Charmel Paris ✨%0A%0Aأرغب في حجز موعد.%0A%0Aالاسم: ${encodeURIComponent(name)}%0Aالهاتف: ${encodeURIComponent(phone)}%0Aالخدمة: ${encodeURIComponent(service)}%0Aالتاريخ: ${encodeURIComponent(pretty)}%0Aالوقت: ${encodeURIComponent(time)}${message?`%0Aالملاحظات: ${encodeURIComponent(message)}`:""}%0A%0Aيرجى تأكيد الموعد.`;
    status.textContent="سيتم فتح واتساب لإرسال طلب الحجز...";
    window.open(`https://wa.me/${WA}?text=${text}`,"_blank","noopener,noreferrer");
  });
}
const observer=new IntersectionObserver(entries=>{
  entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add("show");observer.unobserve(e.target);}})
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

const sections=[...document.querySelectorAll("main section[id]")];
const links=[...document.querySelectorAll(".nav a:not(.nav-cta)")];
window.addEventListener("scroll",()=>{
  let current="home";
  sections.forEach(s=>{if(window.scrollY>=s.offsetTop-180)current=s.id});
  links.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+current));
});
