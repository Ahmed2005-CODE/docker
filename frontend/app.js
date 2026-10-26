const habitForm = document.querySelector("#habit-form");
const nameInput = document.querySelector("#habit-name");
const habitsList = document.querySelector("#habits-list");
const habitCount = document.querySelector("#habit-count");
const statusMessage = document.querySelector("#status-message");

// استخدم نفس المصدر داخل Docker، والباك المحلي عند تشغيل الواجهة منفصلة أثناء التطوير.
const API_BASE =
  window.location.protocol === "http:" && ["3000", "8080"].includes(window.location.port)
    ? ""
    : `http://${window.location.hostname || "localhost"}:3000`;
const arabicNumber = new Intl.NumberFormat("ar");
const weekdayFormatter = new Intl.DateTimeFormat("ar", { weekday: "short", timeZone: "UTC" });

function getUtcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function getLastSevenDays() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (6 - index));
    return { key: getUtcDateKey(date), label: weekdayFormatter.format(date) };
  });
}

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const responseText = await response.text();
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      const message = response.ok
        ? "الخادم أرسل ردًا غير مفهوم. تأكد من تشغيل الباك على نفس المنفذ."
        : `تعذّر تنفيذ الطلب (HTTP ${response.status}). تأكد من تشغيل الباك بشكل صحيح.`;
      throw new Error(message);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `تعذّر إكمال الطلب (HTTP ${response.status})`);
  }
  if (data === null) {
    throw new Error("الخادم أرسل ردًا فارغًا. تأكد من تشغيل الباك بشكل صحيح.");
  }

  return data;
}

function showMessage(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function createDayCell(day, checkins, today) {
  const cell = document.createElement("div");
  cell.className = "day-cell";

  const dot = document.createElement("span");
  dot.className = "day-dot";
  if (checkins.includes(day.key)) dot.classList.add("done");
  if (day.key === today) dot.classList.add("today");
  dot.setAttribute("aria-label", checkins.includes(day.key) ? `${day.label}: تم` : day.label);

  const label = document.createElement("span");
  label.textContent = day.label;
  cell.append(dot, label);
  return cell;
}

function createHabitCard(habit, days, today) {
  const card = document.createElement("article");
  card.className = "habit-card";

  const top = document.createElement("div");
  top.className = "habit-top";

  const name = document.createElement("h3");
  name.className = "habit-name";
  name.textContent = habit.name;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "حذف";
  deleteButton.setAttribute("aria-label", `حذف عادة ${habit.name}`);
  deleteButton.addEventListener("click", () => deleteHabit(habit._id));
  top.append(name, deleteButton);

  const actions = document.createElement("div");
  actions.className = "habit-actions";

  const checkButton = document.createElement("button");
  checkButton.className = "check-button";
  checkButton.type = "button";
  checkButton.disabled = habit.checkins.includes(today);
  checkButton.textContent = checkButton.disabled ? "تم تسجيلها اليوم ✓" : "تم النهارده ✓";
  checkButton.addEventListener("click", () => checkHabit(habit._id));

  const streak = document.createElement("span");
  streak.className = "streak";
  streak.textContent = `${arabicNumber.format(habit.streak)} يوم متتالي 🔥`;
  actions.append(checkButton, streak);

  const week = document.createElement("div");
  week.className = "week-row";
  week.setAttribute("aria-label", "إنجازات آخر سبعة أيام");
  for (const day of days) {
    week.append(createDayCell(day, habit.checkins, today));
  }

  card.append(top, actions, week);
  return card;
}

function renderHabits(habits) {
  const days = getLastSevenDays();
  const today = days[days.length - 1].key;
  habitsList.replaceChildren();
  habitCount.textContent = `${arabicNumber.format(habits.length)} ${habits.length === 1 ? "عادة" : "عادات"}`;

  if (habits.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const title = document.createElement("strong");
    title.textContent = "لسه مفيش عادات";
    const text = document.createElement("span");
    text.textContent = "ابدأ بإضافة أول عادة تحب تلتزم بها.";
    empty.append(title, text);
    habitsList.append(empty);
    return;
  }

  for (const habit of habits) {
    habitsList.append(createHabitCard(habit, days, today));
  }
}

async function loadHabits() {
  try {
    const habits = await request("/habits");
    renderHabits(habits);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function checkHabit(id) {
  try {
    await request(`/habits/${encodeURIComponent(id)}/check`, { method: "POST" });
    showMessage("عظيم! تم تسجيل إنجاز اليوم 🎉");
    await loadHabits();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deleteHabit(id) {
  if (!window.confirm("هل أنت متأكد من حذف هذه العادة؟")) return;

  try {
    await request(`/habits/${encodeURIComponent(id)}`, { method: "DELETE" });
    showMessage("تم حذف العادة.");
    await loadHabits();
  } catch (error) {
    showMessage(error.message, true);
  }
}

habitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  try {
    await request("/habits", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    nameInput.value = "";
    showMessage("تمت إضافة العادة بنجاح.");
    await loadHabits();
    nameInput.focus();
  } catch (error) {
    showMessage(error.message, true);
  }
});

loadHabits();
