/* =========================================
   EcoSmart – script.js
   ========================================= */

const API_BASE = 'http://localhost:5000';

const gpsBtn = document.getElementById("gpsBtn");

gpsBtn.addEventListener("click", () => {

    if(!navigator.geolocation){
      alert("GPS not supported.");
      return;
    }

    gpsBtn.innerHTML="📡 Getting Location...";
    navigator.geolocation.getCurrentPosition(
    (position)=>{
      document.getElementById("latitude").value=
      position.coords.latitude;

      document.getElementById("longitude").value=
      position.coords.longitude;

      gpsBtn.innerHTML="✅ Location Captured";
    },

    ()=>{
      alert("Unable to get location");
      gpsBtn.innerHTML="📍 Use Current Location";
    }
    );
});

/* ===== DARK MODE TOGGLE ===== */
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

function setTheme(dark) {
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  darkToggle.querySelector('.toggle-icon').textContent = dark ? '☀️' : '🌙';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
setTheme(savedTheme === 'dark');

darkToggle.addEventListener('click', () => {
  setTheme(html.getAttribute('data-theme') !== 'dark');
});


/* ===== NAVBAR SCROLL ===== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});


/* ===== MOBILE MENU ===== */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobile() {
  mobileMenu.classList.remove('open');
}


/* ===== SCROLL REVEAL ===== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.schedule-card, .awareness-card, .stat-card, .activity-item, .form-card')
  .forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });


/* ===== COUNTER ANIMATION ===== */
let statsLoaded = false;

async function loadAndAnimateStats() {
  if (statsLoaded) return;
  statsLoaded = true;

  let reported = 0;
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) {
      const data = await res.json();
      reported = data.total_reported || 0;
    }
  } catch (e) {
    // Flask not running – show demo values
  }

  const counters = [
    { id: 'statReported', target: reported, suffix: '' },
    { id: 'statResolved',  target: 38,      suffix: '' },
    { id: 'statBins',      target: 142,     suffix: '' },
    { id: 'statRate',      target: 98,      suffix: '%', el_id: 'statRate' },
  ];

  counters.forEach(({ id, target, suffix }) => {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const duration = 1800;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.innerHTML = current + (suffix === '%' ? '<span class="pct">%</span>' : '');
      if (current >= target) clearInterval(timer);
    }, 16);
  });
}

// Trigger counter when dashboard is visible
const dashObs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadAndAnimateStats();
    dashObs.disconnect();
  }
}, { threshold: 0.2 });

const dashSection = document.getElementById('dashboard');
if (dashSection) dashObs.observe(dashSection);


/* ===== REPORT FORM ===== */
const reportForm = document.getElementById('reportForm');
const submitBtn  = document.getElementById('submitBtn');
const btnText    = submitBtn.querySelector('.btn-text');
const btnLoader  = submitBtn.querySelector('.btn-loader');

function showError(fieldId, msg) {
  const el = document.getElementById(fieldId + 'Error');
  const input = document.getElementById(fieldId) || document.getElementById(fieldId.replace('Error', ''));
  if (el) el.textContent = msg;
  if (input) input.classList.add('error');
}
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.textContent = '');
  document.querySelectorAll('.error').forEach(e => e.classList.remove('error'));
}

function validateForm(data) {
  let valid = true;
  if (!data.name.trim()) { showError('name', 'Please enter your name.'); valid = false; }
  if (!data.location.trim()) { showError('location', 'Please enter the location.'); valid = false; }
  if (!data.issue_type) { showError('issue', 'Please select an issue type.'); valid = false; }
  return valid;
}

reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();


  const data = {
      name: document.getElementById("name").value,
      location: document.getElementById("location").value,
      issue_type: document.getElementById("issueType").value,
       description: document.getElementById("description").value
  };

  if (!validateForm(data)) return;

  
  // Loading state
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("location", data.location);
    formData.append("issue_type", data.issue_type);
    formData.append("description", data.description);
    formData.append(
    "latitude",
    document.getElementById("latitude").value
    );

    formData.append(
    "longitude",
    document.getElementById("longitude").value
    );

    const image = document.getElementById("image").files[0];

    if (image) {
        formData.append("image", image);
    }

    const res = await fetch(`${API_BASE}/report`, {
        method: "POST",
        body: formData
    });

    const result = await res.json();  

    if (res.ok) {
      reportForm.reset();

      document.getElementById("latitude").value = "";
      document.getElementById("longitude").value = "";

      gpsBtn.innerHTML = "📍 Use Current Location";

      showPopup(result.issue_id);

      // Add to activity list
      addActivity(data);
    } else {
      alert('Error: ' + (result.error || 'Something went wrong.'));
    }
  } catch (err) {
    // Flask not running – simulate success for demo

    reportForm.reset();

    document.getElementById("latitude").value = "";
    document.getElementById("longitude").value = "";
    gpsBtn.innerHTML = "📍 Use Current Location";

    showPopup('DEMO-' + Math.floor(Math.random() * 9000 + 1000));
    addActivity(data);
    
    console.warn('Flask not reachable, running in demo mode.');
  } finally {
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    submitBtn.disabled = false;
  }
});


/* ===== POPUP ===== */
function showPopup(issueId) {
  const popup = document.getElementById('popup');
  const popupId = document.getElementById('popupId');
  popupId.textContent = issueId ? `Issue ID: #${issueId}` : '';
  popup.classList.add('show');
}

function closePopup() {
  document.getElementById('popup').classList.remove('show');
}

// Close on overlay click
document.getElementById('popup').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closePopup();
});


/* ===== ADD ACTIVITY ITEM ===== */
function addActivity(data) {
  const list = document.getElementById('activityList');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'activity-item';
  item.style.animation = 'fadeUp 0.4s both';
  item.innerHTML = `
    <span class="act-dot orange"></span>
    <span class="act-text">${data.issue_type} reported – ${data.location} by ${data.name}</span>
    <span class="act-time">Just now</span>
  `;

  list.insertBefore(item, list.firstChild);

  // Update reported stat in dashboard if visible
  const el = document.getElementById('statReported');
  if (el) {
    const cur = parseInt(el.textContent) || 0;
    el.textContent = cur + 1;
  }
}


/* ===== SMOOTH ACTIVE NAV LINK ===== */
const sections = document.querySelectorAll('section[id]');
const navLinksAll = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.getAttribute('id');
  });
  navLinksAll.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current
      ? 'var(--c-accent)'
      : '';
  });
});


document.getElementById("copyright").innerHTML =
    `© ${new Date().getFullYear()} EcoSmart. Built with 💚 for a cleaner tomorrow.`;
