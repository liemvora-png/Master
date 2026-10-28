const manager = document.querySelector("#portfolio-admin-content");
const managerStatus = document.querySelector("#portfolio-admin-status");
const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
let portfolio;
let gallery;

function setManagerStatus(message, state = "") {
  managerStatus.textContent = message;
  managerStatus.dataset.state = state;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function field(label, value, { type = "text", multiline = false, maxLength = 500, onInput } = {}) {
  const wrapper = createElement("label", "content-field");
  wrapper.append(createElement("span", "", label));
  const control = document.createElement(multiline ? "textarea" : "input");
  if (multiline) control.rows = 3;
  else control.type = type;
  control.maxLength = maxLength;
  control.value = value ?? "";
  if (onInput) control.addEventListener("input", () => onInput(control.value));
  wrapper.append(control);
  return wrapper;
}

function button(label, action, className = "editor-button editor-button-secondary") {
  const control = document.createElement("button");
  control.type = "button";
  control.className = className;
  control.textContent = label;
  control.addEventListener("click", action);
  return control;
}

function makeGroup(title, help) {
  const section = createElement("section", "portfolio-admin-group");
  section.append(createElement("h3", "", title), createElement("p", "editor-help", help));
  return section;
}

function makeOptions(values, selected) {
  const select = document.createElement("select");
  for (const [value, label] of values) {
    const option = new Option(label, value);
    select.add(option);
  }
  select.value = selected;
  return select;
}

function renderServiceSettings(root) {
  const group = makeGroup("Offerings", "Edit service names, descriptions, and optional public prices. Leave a price blank to hide it.");
  for (const service of portfolio.services) {
    const row = createElement("div", "portfolio-row");
    row.append(
      field("Service title", service.title, { maxLength: 120, onInput: (value) => { service.title = value; } }),
      field("Price (optional)", service.price || "", { maxLength: 80, onInput: (value) => { service.price = value; } }),
      field("Description", service.description, {
        multiline: true,
        maxLength: 1000,
        onInput: (value) => { service.description = value; }
      })
    );
    row.lastElementChild.classList.add("full-width");
    group.append(row);
  }

  group.append(button("Save services and availability", savePortfolio, "editor-button"));
  root.append(group);
}

function renderAvailability(root) {
  const group = makeGroup(
    "Lesson availability",
    "Add weekly lesson windows or date-specific exceptions. A dated entry replaces the normal weekly hours for that date; turn it off to block that date."
  );
  portfolio.availability.forEach((entry, index) => {
    const row = createElement("div", "portfolio-row availability-row");
    const day = makeOptions(weekdayNames.map((name, value) => [String(value), name]), String(entry.day_of_week));
    day.addEventListener("change", () => { entry.day_of_week = Number(day.value); });
    const dayField = createElement("label", "content-field");
    dayField.append(createElement("span", "", "Day of week"), day);
    row.append(dayField);
    row.append(field("Starts", entry.start_time, {
      type: "time",
      onInput: (value) => { entry.start_time = value; }
    }));
    row.append(field("Ends", entry.end_time, {
      type: "time",
      onInput: (value) => { entry.end_time = value; }
    }));
    row.append(field("Specific date (optional)", entry.exception_date || "", {
      type: "date",
      onInput: (value) => { entry.exception_date = value || null; }
    }));
    const availability = document.createElement("label");
    availability.className = "content-field availability-toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = entry.is_available !== false && entry.is_available !== 0;
    checkbox.addEventListener("change", () => { entry.is_available = checkbox.checked; });
    availability.append(checkbox, createElement("span", "", "Available"));
    row.append(availability);
    row.append(button("Remove", () => {
      portfolio.availability.splice(index, 1);
      renderManager();
    }, "editor-button editor-button-danger"));
    group.append(row);
  });
  group.append(
    button("Add availability", () => {
      portfolio.availability.push({
        day_of_week: 1,
        start_time: "10:00",
        end_time: "11:00",
        exception_date: null,
        is_available: true
      });
      renderManager();
    }, "editor-button editor-button-add"),
    button("Save services and availability", savePortfolio, "editor-button")
  );
  root.append(group);
}

function renderGallery(root) {
  const group = makeGroup("Photography gallery", "Upload up to 8 MB per image. Every photo needs alt text. Unpublished images remain available here for later use.");
  const upload = document.createElement("form");
  upload.className = "gallery-upload";
  upload.enctype = "multipart/form-data";
  const image = field("Image file", "", { type: "file" });
  image.querySelector("input").accept = "image/jpeg,image/png,image/webp,image/gif";
  image.querySelector("input").required = true;
  const altText = field("Alt text", "", { maxLength: 240 });
  altText.querySelector("input").required = true;
  const caption = field("Caption (optional)", "", { maxLength: 300 });
  upload.append(image, altText, caption);
  const submit = document.createElement("button");
  submit.className = "editor-button";
  submit.type = "submit";
  submit.textContent = "Upload photo";
  upload.append(submit);
  upload.addEventListener("submit", uploadPhoto);
  group.append(upload);

  gallery.forEach((photo, index) => {
    const row = createElement("article", "portfolio-row portfolio-gallery-row");
    const preview = createElement("div", "portfolio-image");
    const img = document.createElement("img");
    img.src = photo.image_url;
    img.alt = photo.alt_text;
    img.loading = "lazy";
    preview.append(img);
    row.append(preview);
    row.append(field("Alt text", photo.alt_text, {
      maxLength: 240,
      onInput: (value) => { photo.alt_text = value; }
    }));
    row.append(field("Caption", photo.caption, {
      maxLength: 300,
      onInput: (value) => { photo.caption = value; }
    }));
    const visibility = document.createElement("label");
    visibility.className = "content-field";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = photo.active === 1;
    checkbox.addEventListener("change", () => { photo.active = checkbox.checked; });
    visibility.append(checkbox, createElement("span", "", "Visible on public gallery"));
    row.append(visibility);
    const actions = createElement("div", "portfolio-actions");
    actions.append(
      button("Move up", () => movePhoto(index, -1), "editor-button editor-button-secondary"),
      button("Move down", () => movePhoto(index, 1), "editor-button editor-button-secondary"),
      button("Delete photo", () => deletePhoto(photo.id), "editor-button editor-button-danger")
    );
    row.append(actions);
    group.append(row);
  });
  group.append(button("Save gallery changes", saveGallery, "editor-button"));
  root.append(group);
}

function renderBookings(root) {
  const group = makeGroup("Lesson requests", "Booking requests are private to this editor. Confirming a request reserves its date and time; cancelling releases the slot.");
  if (portfolio.bookings.length === 0) {
    group.append(createElement("p", "empty-state", "No lesson requests yet."));
  }
  for (const booking of portfolio.bookings) {
    const card = createElement("article", "portfolio-booking");
    const heading = createElement("h4", "", `${booking.name} — ${booking.lesson_date} at ${booking.lesson_time}`);
    const email = document.createElement("a");
    email.href = `mailto:${encodeURIComponent(booking.email)}`;
    email.textContent = booking.email;
    const note = createElement("p", "", booking.note || "No note");
    const status = makeOptions(
      [["pending", "Pending"], ["confirmed", "Confirmed"], ["cancelled", "Cancelled"]],
      booking.status
    );
    const statusField = createElement("label", "content-field");
    statusField.append(createElement("span", "", "Status"), status);
    status.addEventListener("change", () => updateBooking(booking.id, status.value));
    card.append(heading, email, note, statusField);
    card.append(button("Delete request", () => deleteBooking(booking.id), "editor-button editor-button-danger"));
    group.append(card);
  }
  root.append(group);
}

function renderManager() {
  manager.replaceChildren();
  if (!portfolio || !gallery) return;
  renderServiceSettings(manager);
  renderAvailability(manager);
  renderGallery(manager);
  renderBookings(manager);
}

async function requestJson(url, options = {}) {
  const response = await window.adminAuth.fetch(url, {
    ...options,
    headers: { Accept: "application/json", ...(options.headers || {}) },
    credentials: "same-origin"
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

async function loadManager() {
  setManagerStatus("Loading services, gallery, and requests…");
  try {
    portfolio = await requestJson("/api/admin/portfolio");
    gallery = portfolio.gallery;
    renderManager();
    setManagerStatus("Service manager is ready.", "success");
  } catch (error) {
    setManagerStatus(`Could not load services and requests: ${error.message}`, "error");
  }
}

async function savePortfolio() {
  setManagerStatus("Saving services and availability…");
  try {
    await requestJson("/api/admin/portfolio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        services: portfolio.services,
        testPrepOptions: portfolio.testPrepOptions,
        availability: portfolio.availability
      })
    });
    await loadManager();
    setManagerStatus("Services and availability saved.", "success");
  } catch (error) {
    setManagerStatus(`Could not save service settings: ${error.message}`, "error");
  }
}

async function uploadPhoto(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData();
  data.set("image", form.querySelector('[type="file"]').files[0]);
  data.set("altText", form.querySelectorAll("input")[1].value);
  data.set("caption", form.querySelectorAll("input")[2].value);
  setManagerStatus("Uploading photo…");
  try {
    await requestJson("/api/admin/gallery", { method: "POST", body: data });
    await loadManager();
    setManagerStatus("Photo uploaded.", "success");
  } catch (error) {
    setManagerStatus(`Could not upload photo: ${error.message}`, "error");
  }
}

function movePhoto(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= gallery.length) return;
  [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
  gallery.forEach((photo, position) => { photo.position = position + 1; });
  renderManager();
}

async function saveGallery() {
  setManagerStatus("Saving gallery changes…");
  try {
    await requestJson("/api/admin/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images: gallery.map((photo, index) => ({
          id: photo.id,
          alt_text: photo.alt_text,
          caption: photo.caption,
          position: index + 1,
          active: photo.active === true || photo.active === 1
        }))
      })
    });
    await loadManager();
    setManagerStatus("Gallery changes saved.", "success");
  } catch (error) {
    setManagerStatus(`Could not save gallery changes: ${error.message}`, "error");
  }
}

async function deletePhoto(id) {
  if (!window.confirm("Delete this photo and remove it from the gallery?")) return;
  try {
    await requestJson(`/api/admin/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadManager();
    setManagerStatus("Photo deleted.", "success");
  } catch (error) {
    setManagerStatus(`Could not delete photo: ${error.message}`, "error");
  }
}

async function updateBooking(id, status) {
  try {
    await requestJson(`/api/admin/bookings/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    await loadManager();
    setManagerStatus("Booking status updated.", "success");
  } catch (error) {
    setManagerStatus(`Could not update booking: ${error.message}`, "error");
    await loadManager();
  }
}

async function deleteBooking(id) {
  if (!window.confirm("Permanently delete this booking request?")) return;
  try {
    await requestJson(`/api/admin/bookings/${encodeURIComponent(id)}`, { method: "DELETE" });
    await loadManager();
    setManagerStatus("Booking request deleted.", "success");
  } catch (error) {
    setManagerStatus(`Could not delete booking: ${error.message}`, "error");
  }
}

window.adminAuth.ready.then(() => loadManager()).catch(() => {});
