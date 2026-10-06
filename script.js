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

const form=document.getElementById("bookingForm");
const status=document.getElementById("formStatus");
const WA="97444881336";

if(form){
  form.addEventListener("submit",(e)=>{
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
    const lines=[
      "مرحباً Charmel Paris ✨",
      "",
      "أرغب في حجز موعد.",
      "",
      `الاسم: ${name}`,
      `الهاتف: ${phone}`,
      `الخدمة: ${service}`,
      `التاريخ: ${pretty}`,
      `الوقت: ${time}`,
      message?`الملاحظات: ${message}`:"",
      "",
      "يرجى تأكيد الموعد."
    ].filter(Boolean).join("\n");

    status.textContent="سيتم فتح WhatsApp لإرسال طلب الحجز...";
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(lines)}`,"_blank","noopener,noreferrer");

    const old=JSON.parse(localStorage.getItem("charmelBookings")||"[]");
    old.push({name,phone,service,date,time,message,createdAt:new Date().toISOString()});
    localStorage.setItem("charmelBookings",JSON.stringify(old));
  });
}

const observer=new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add("show");
      observer.unobserve(entry.target);
    }
  });
},{threshold:.12});
document.querySelectorAll(".reveal").forEach(el=>observer.observe(el));

const sections=[...document.querySelectorAll("main section[id]")];
const links=[...document.querySelectorAll(".nav a:not(.nav-button)")];
window.addEventListener("scroll",()=>{
  let current="home";
  sections.forEach(section=>{
    if(scrollY>=section.offsetTop-190) current=section.id;
  });
  links.forEach(link=>link.classList.toggle("active",link.getAttribute("href")==="#"+current));
});
