document.addEventListener("DOMContentLoaded", () => {
  const header = document.getElementById("siteHeader");
  const menuBtn = document.getElementById("menuBtn");
  const nav = document.getElementById("navMenu");
  const bookingForm = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  const dateInput = document.getElementById("date");
  const year = document.getElementById("year");

  // =========================
  // 1) MOBILE MENU
  // =========================
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // =========================
  // 2) HEADER ON SCROLL
  // =========================
  const updateHeader = () => {
    if (!header) return;
    header.style.background =
      window.scrollY > 30
        ? "rgba(8,8,8,.96)"
        : "rgba(8,8,8,.72)";
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // =========================
  // 3) CURRENT YEAR
  // =========================
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  // =========================
  // 4) MINIMUM BOOKING DATE
  // =========================
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dateInput.min = `${yyyy}-${mm}-${dd}`;
  }

  // =========================
  // 5) WHATSAPP BOOKING
  // Change this number if the salon's WhatsApp is different.
  // =========================
  const WHATSAPP_NUMBER = "97444881336";

  if (bookingForm) {
    bookingForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = document.getElementById("name")?.value.trim();
      const phone = document.getElementById("phone")?.value.trim();
      const service = document.getElementById("service")?.value;
      const date = document.getElementById("date")?.value;
      const time = document.getElementById("time")?.value;
      const message = document.getElementById("message")?.value.trim();

      if (!name || !phone || !service || !date || !time) {
        if (formStatus) {
          formStatus.textContent = "يرجى ملء جميع الحقول المطلوبة.";
        }
        return;
      }

      const dateObject = new Date(`${date}T00:00:00`);
      const formattedDate = dateObject.toLocaleDateString("ar-QA", {
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      let whatsappMessage =
`مرحباً Charmel Paris ✦

أرغب في حجز موعد.

الاسم: ${name}
الهاتف: ${phone}
الخدمة: ${service}
التاريخ: ${formattedDate}
الوقت: ${time}`;

      if (message) {
        whatsappMessage += `\nملاحظات: ${message}`;
      }

      whatsappMessage += "\n\nأرجو تأكيد الموعد. شكراً لكم.";

      const url =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

      if (formStatus) {
        formStatus.textContent = "جاري فتح واتساب لإرسال طلب الحجز...";
      }

      window.open(url, "_blank", "noopener,noreferrer");
    });
  }

  // =========================
  // 6) REVEAL ANIMATIONS
  // =========================
  const revealItems = document.querySelectorAll(
    ".service-card, .gallery-item, .contact-card, .about-content, .about-image"
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    revealItems.forEach(item => {
      item.classList.add("reveal");
      observer.observe(item);
    });
  }

  // =========================
  // 7) ACTIVE NAVIGATION
  // =========================
  const sections = document.querySelectorAll("main section[id]");
  const links = document.querySelectorAll(".nav a");

  const updateActiveLink = () => {
    let current = "home";

    sections.forEach(section => {
      const top = section.offsetTop - 180;
      if (window.scrollY >= top) {
        current = section.id;
      }
    });

    links.forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${current}`
      );
    });
  };

  updateActiveLink();
  window.addEventListener("scroll", updateActiveLink, { passive: true });
});
