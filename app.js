const MAX_CAPACITY = 500;
const MIN_GOAL = 200;
const STORAGE_KEY = "motos_ranch_dashboard_v1";

const INITIAL_ATTENDEES = [
  { id: 1, name: "Gastón Quiroga", participatesRaffle: true, raffleNumber: 101 },
  { id: 2, name: "Laura Méndez", participatesRaffle: true, raffleNumber: 102 },
  { id: 3, name: "Charly Sierra", participatesRaffle: true, raffleNumber: 103 },
  { id: 4, name: "Marcelo Sosa", participatesRaffle: true, raffleNumber: 104 },
  { id: 5, name: "Facundo Giménez", participatesRaffle: true, raffleNumber: 105 },
  { id: 6, name: "Romina Herrera", participatesRaffle: true, raffleNumber: 106 },
  { id: 7, name: "Diego Albornoz", participatesRaffle: true, raffleNumber: 107 },
  { id: 8, name: "Valeria Castro", participatesRaffle: true, raffleNumber: 108 },
  { id: 9, name: "Nicolás Ibáñez", participatesRaffle: true, raffleNumber: 109 },
  { id: 10, name: "Sofía Benítez", participatesRaffle: true, raffleNumber: 110 }
];

function getDefaultEventDateISO() {
  const target = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  target.setHours(20, 0, 0, 0);
  return target.toISOString();
}

function toDatetimeLocalValue(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        eventDate: getDefaultEventDateISO(),
        attendees: structuredClone(INITIAL_ATTENDEES)
      };
    }
    const parsed = JSON.parse(raw);
    return {
      eventDate: parsed.eventDate || getDefaultEventDateISO(),
      attendees: Array.isArray(parsed.attendees) ? parsed.attendees : structuredClone(INITIAL_ATTENDEES)
    };
  } catch {
    return {
      eventDate: getDefaultEventDateISO(),
      attendees: structuredClone(INITIAL_ATTENDEES)
    };
  }
}

let state = loadState();

// Referencias DOM
const el = {
  cdDays: document.getElementById("cdDays"),
  cdHours: document.getElementById("cdHours"),
  cdMinutes: document.getElementById("cdMinutes"),
  cdSeconds: document.getElementById("cdSeconds"),
  eventDateLabel: document.getElementById("eventDateLabel"),
  timerStatusText: document.getElementById("timerStatusText"),
  toggleDateEditorBtn: document.getElementById("toggleDateEditorBtn"),
  dateEditorPanel: document.getElementById("dateEditorPanel"),
  eventDateInput: document.getElementById("eventDateInput"),
  saveEventDateBtn: document.getElementById("saveEventDateBtn"),
  pieSlicesGroup: document.getElementById("pieSlicesGroup"),
  pieCenterCount: document.getElementById("pieCenterCount"),
  capacityPercentBadge: document.getElementById("capacityPercentBadge"),
  confirmedCountText: document.getElementById("confirmedCountText"),
  raffleCountText: document.getElementById("raffleCountText"),
  availableCountText: document.getElementById("availableCountText"),
  minGoalStatus: document.getElementById("minGoalStatus"),
  addAttendeeForm: document.getElementById("addAttendeeForm"),
  attendeeName: document.getElementById("attendeeName"),
  attendeeRaffle: document.getElementById("attendeeRaffle"),
  formFeedback: document.getElementById("formFeedback"),
  searchInput: document.getElementById("searchInput"),
  raffleFilter: document.getElementById("raffleFilter"),
  attendeesTableBody: document.getElementById("attendeesTableBody"),
  resetDemoBtn: document.getElementById("resetDemoBtn")
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getNextRaffleNumber() {
  const maxNum = state.attendees.reduce((max, item) => {
    return typeof item.raffleNumber === "number" && item.raffleNumber > max ? item.raffleNumber : max;
  }, 100);
  return maxNum + 1;
}

// TEMPORIZADOR
function formatEventDateLabel(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "Fecha no válida";
  return d.toLocaleString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateCountdown() {
  const targetMs = new Date(state.eventDate).getTime();
  const nowMs = Date.now();
  const diff = targetMs - nowMs;

  el.eventDateLabel.textContent = `Evento: ${formatEventDateLabel(state.eventDate)}`;

  if (Number.isNaN(targetMs)) {
    el.cdDays.textContent = "--";
    el.cdHours.textContent = "--";
    el.cdMinutes.textContent = "--";
    el.cdSeconds.textContent = "--";
    el.timerStatusText.textContent = "Configurá una fecha válida para iniciar el temporizador.";
    return;
  }

  if (diff <= 0) {
    el.cdDays.textContent = "00";
    el.cdHours.textContent = "00";
    el.cdMinutes.textContent = "00";
    el.cdSeconds.textContent = "00";
    el.timerStatusText.textContent = "¡El evento MOTO'S RANCH ya comenzó o la fecha ya pasó!";
    return;
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  el.cdDays.textContent = String(days).padStart(2, "0");
  el.cdHours.textContent = String(hours).padStart(2, "0");
  el.cdMinutes.textContent = String(minutes).padStart(2, "0");
  el.cdSeconds.textContent = String(seconds).padStart(2, "0");
  el.timerStatusText.textContent = `Faltan ${days} días para arrancar en MOTO'S RANCH.`;
}

// GRÁFICO DE TORTA SVG (SOBRE 500 PERSONAS)
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}

function describePieSlice(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [
    "M", cx, cy,
    "L", start.x.toFixed(3), start.y.toFixed(3),
    "A", r, r, 0, largeArcFlag, 0, end.x.toFixed(3), end.y.toFixed(3),
    "Z"
  ].join(" ");
}

function renderCapacityChart() {
  const totalConfirmed = state.attendees.length;
  const raffleCount = state.attendees.filter((a) => a.participatesRaffle).length;
  const nonRaffleConfirmed = Math.max(0, totalConfirmed - raffleCount);
  const available = Math.max(0, MAX_CAPACITY - totalConfirmed);
  const pct = ((totalConfirmed / MAX_CAPACITY) * 100).toFixed(1).replace(/\.0$/, "");

  el.pieCenterCount.textContent = String(totalConfirmed);
  el.capacityPercentBadge.textContent = `${pct}%`;
  el.confirmedCountText.textContent = `${totalConfirmed} ${totalConfirmed === 1 ? "persona" : "personas"}`;
  el.raffleCountText.textContent = `${raffleCount} ${raffleCount === 1 ? "participante" : "participantes"}`;
  el.availableCountText.textContent = `${available} ${available === 1 ? "lugar" : "lugares"}`;

  if (totalConfirmed >= MIN_GOAL) {
    el.minGoalStatus.textContent = `Alcanzado (${totalConfirmed}/200)`;
  } else {
    el.minGoalStatus.textContent = `Faltan ${MIN_GOAL - totalConfirmed} para 200`;
  }

  // Segmentos proporcionales a MAX_CAPACITY (500)
  const segments = [
    { value: raffleCount, color: "#10b981", label: `En sorteo: ${raffleCount}` },
    { value: nonRaffleConfirmed, color: "#f59e0b", label: `Confirmados sin sorteo: ${nonRaffleConfirmed}` },
    { value: available, color: "#27272f", label: `Cupo libre: ${available}` }
  ].filter((s) => s.value > 0);

  el.pieSlicesGroup.innerHTML = "";
  const cx = 110;
  const cy = 110;
  const r = 88;

  if (segments.length === 1 && segments[0].value === MAX_CAPACITY) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", cx);
    circle.setAttribute("cy", cy);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", segments[0].color);
    el.pieSlicesGroup.appendChild(circle);
    return;
  }

  let currentAngle = 0;
  for (const seg of segments) {
    const sweep = (seg.value / MAX_CAPACITY) * 360;
    const nextAngle = currentAngle + sweep;

    if (sweep >= 359.99) {
      const fullCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      fullCircle.setAttribute("cx", cx);
      fullCircle.setAttribute("cy", cy);
      fullCircle.setAttribute("r", r);
      fullCircle.setAttribute("fill", seg.color);
      fullCircle.setAttribute("class", "pie-slice");
      el.pieSlicesGroup.appendChild(fullCircle);
    } else {
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", describePieSlice(cx, cy, r, currentAngle, nextAngle));
      path.setAttribute("fill", seg.color);
      path.setAttribute("class", "pie-slice");

      const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
      title.textContent = `${seg.label} (de ${MAX_CAPACITY})`;
      path.appendChild(title);

      el.pieSlicesGroup.appendChild(path);
    }

    currentAngle = nextAngle;
  }
}

// TABLA DE ASISTENTES
function renderAttendeesTable() {
  const query = el.searchInput.value.trim().toLowerCase();
  const filter = el.raffleFilter.value;

  const filtered = state.attendees.filter((person) => {
    const matchesRaffle =
      filter === "all" ||
      (filter === "yes" && person.participatesRaffle) ||
      (filter === "no" && !person.participatesRaffle);

    const raffleStr = person.raffleNumber ? `#${person.raffleNumber}` : "";
    const matchesQuery =
      !query ||
      person.name.toLowerCase().includes(query) ||
      raffleStr.toLowerCase().includes(query);

    return matchesRaffle && matchesQuery;
  });

  el.attendeesTableBody.innerHTML = "";

  if (filtered.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="5" class="empty-row">No hay personas que coincidan con el filtro actual.</td>`;
    el.attendeesTableBody.appendChild(tr);
    return;
  }

  filtered.forEach((person, idx) => {
    const tr = document.createElement("tr");

    const tdIndex = document.createElement("td");
    tdIndex.textContent = String(idx + 1);

    const tdName = document.createElement("td");
    tdName.textContent = person.name;
    tdName.style.fontWeight = "600";

    const tdRaffle = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `pill ${person.participatesRaffle ? "pill-yes" : "pill-no"}`;
    pill.textContent = person.participatesRaffle ? "Sí participa" : "No participa";
    tdRaffle.appendChild(pill);

    const tdNum = document.createElement("td");
    if (person.participatesRaffle && person.raffleNumber) {
      tdNum.innerHTML = `<span class="raffle-num">#${person.raffleNumber}</span>`;
    } else {
      tdNum.textContent = "—";
      tdNum.style.color = "var(--muted)";
    }

    const tdActions = document.createElement("td");
    tdActions.className = "actions-cell";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "btn btn-secondary btn-sm";
    toggleBtn.textContent = person.participatesRaffle ? "Quitar sorteo" : "Sumar a sorteo";
    toggleBtn.addEventListener("click", () => toggleRaffle(person.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-danger-soft btn-sm";
    delBtn.textContent = "Eliminar";
    delBtn.addEventListener("click", () => removeAttendee(person.id));

    tdActions.appendChild(toggleBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdIndex);
    tr.appendChild(tdName);
    tr.appendChild(tdRaffle);
    tr.appendChild(tdNum);
    tr.appendChild(tdActions);

    el.attendeesTableBody.appendChild(tr);
  });
}

function showFeedback(msg, isError = false) {
  el.formFeedback.textContent = msg;
  el.formFeedback.style.color = isError ? "#fda4af" : "var(--emerald)";
}

function addAttendee(name, participatesRaffle) {
  const cleanName = name.trim();
  if (!cleanName) return;

  if (state.attendees.length >= MAX_CAPACITY) {
    showFeedback(`Se alcanzó el límite máximo de ${MAX_CAPACITY} personas.`, true);
    return;
  }

  const newPerson = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: cleanName,
    participatesRaffle: Boolean(participatesRaffle),
    raffleNumber: participatesRaffle ? getNextRaffleNumber() : null
  };

  state.attendees.push(newPerson);
  saveState();
  renderAll();
  showFeedback(
    participatesRaffle
      ? `Agregado "${cleanName}" con número de sorteo #${newPerson.raffleNumber}.`
      : `Agregado "${cleanName}" al registro (sin sorteo).`
  );
}

function toggleRaffle(id) {
  const person = state.attendees.find((a) => a.id === id);
  if (!person) return;

  person.participatesRaffle = !person.participatesRaffle;
  if (person.participatesRaffle && !person.raffleNumber) {
    person.raffleNumber = getNextRaffleNumber();
  }

  saveState();
  renderAll();
}

function removeAttendee(id) {
  const person = state.attendees.find((a) => a.id === id);
  state.attendees = state.attendees.filter((a) => a.id !== id);
  saveState();
  renderAll();
  if (person) {
    showFeedback(`Se eliminó a "${person.name}" del registro.`);
  }
}

function renderAll() {
  updateCountdown();
  renderCapacityChart();
  renderAttendeesTable();
}

// EVENTOS
el.toggleDateEditorBtn.addEventListener("click", () => {
  el.dateEditorPanel.classList.toggle("hidden");
  el.eventDateInput.value = toDatetimeLocalValue(state.eventDate);
});

el.saveEventDateBtn.addEventListener("click", () => {
  if (!el.eventDateInput.value) return;
  const parsed = new Date(el.eventDateInput.value);
  if (Number.isNaN(parsed.getTime())) return;

  state.eventDate = parsed.toISOString();
  saveState();
  updateCountdown();
  el.dateEditorPanel.classList.add("hidden");
  showFeedback("Fecha del evento actualizada.");
});

el.addAttendeeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addAttendee(el.attendeeName.value, el.attendeeRaffle.checked);
  el.attendeeName.value = "";
  el.attendeeName.focus();
});

el.searchInput.addEventListener("input", renderAttendeesTable);
el.raffleFilter.addEventListener("change", renderAttendeesTable);

el.resetDemoBtn.addEventListener("click", () => {
  state = {
    eventDate: getDefaultEventDateISO(),
    attendees: structuredClone(INITIAL_ATTENDEES)
  };
  saveState();
  renderAll();
  showFeedback("Se restauraron las 10 personas iniciales del sorteo.");
});

// INICIO
renderAll();
setInterval(updateCountdown, 1000);