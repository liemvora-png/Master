const servicesList = document.querySelector("#services-list");
const bookingForm = document.querySelector("#booking-form");
const bookingStatus = document.querySelector("#booking-status");
const dateInput = bookingForm.elements.date;
const timeSelect = bookingForm.elements.time;

function makeSelect(label, name) {
  const wrapper = document.createElement("label");
  wrapper.className = "content-field";
  const caption = document.createElement("span");
  caption.textContent = label;
  const select = document.createElement("select");
  select.name = name;
  wrapper.append(caption, select);
  return { wrapper, select };
}

function renderServices(data) {
  servicesList.replaceChildren();
  const tutoring = data.services.find((service) => service.id === "tutoring");
  for (const service of data.services) {
    const article = document.createElement("article");
    article.className = "service-card";
    const heading = document.createElement("h2");
    heading.textContent = service.title;
    const description = document.createElement("p");
    description.textContent = service.description;
    article.append(heading, description);
    if (service.price) {
      const price = document.createElement("p");
      price.className = "service-price";
      price.textContent = service.price;
      article.append(price);
    }

    if (service.id === "photography") {
      const link = document.createElement("a");
      link.className = "project-link";
      link.href = "/gallery";
      link.textContent = "View photography gallery ↗";
      article.append(link);
    } else if (service.id === "piano") {
      const link = document.createElement("a");
      link.className = "project-link";
      link.href = "#booking-form";
      link.textContent = "Request a lesson ↓";
      article.append(link);
    } else if (service.id === "tutoring" && tutoring) {
      const form = document.createElement("div");
      form.className = "tutoring-selectors";
      const test = makeSelect("Test", "test");
      test.select.id = "test-prep-test";
      test.select.setAttribute("aria-label", "Choose SAT or AP");
      const subject = makeSelect("Subject", "subject");
      subject.select.id = "test-prep-subject";
      subject.select.setAttribute("aria-label", "Choose a tutoring subject");
      subject.select.disabled = true;
      form.append(test.wrapper, subject.wrapper);
      article.append(form);
      const updateSubjects = () => {
        const options = data.testPrepOptions.filter((option) => option.test_name === test.select.value);
        subject.select.replaceChildren(new Option("Choose a subject", ""));
        for (const option of options) subject.select.add(new Option(option.subject, option.subject));
        subject.select.disabled = options.length === 0;
      };
      test.select.add(new Option("Choose SAT or AP", ""));
      for (const name of ["SAT", "AP"]) {
        if (data.testPrepOptions.some((option) => option.test_name === name)) {
          test.select.add(new Option(name, name));
        }
      }
      test.select.addEventListener("change", updateSubjects);
      updateSubjects();
    }
    servicesList.append(article);
  }
  if (data.services.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Services are being updated.";
    servicesList.append(empty);
  }
}

function setBookingStatus(message, state = "") {
  bookingStatus.textContent = message;
  bookingStatus.dataset.state = state;
}

function localDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function loadAvailability() {
  timeSelect.replaceChildren(new Option("Checking available times…", ""));
  timeSelect.disabled = true;
  if (!dateInput.value) {
    timeSelect.replaceChildren(new Option("Choose a date first", ""));
    return;
  }
  try {
    const response = await fetch(`/api/availability?date=${encodeURIComponent(dateInput.value)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load available times.");
    timeSelect.replaceChildren(new Option(
      result.slots.length ? "Choose an available time" : "No times available",
      ""
    ));
    for (const slot of result.slots) timeSelect.add(new Option(slot.time, slot.time));
    timeSelect.disabled = result.slots.length === 0;
  } catch (error) {
    timeSelect.replaceChildren(new Option("Availability unavailable", ""));
    setBookingStatus(error.message, "error");
  }
}

async function submitBooking(event) {
  event.preventDefault();
  const submit = bookingForm.querySelector('[type="submit"]');
  submit.disabled = true;
  setBookingStatus("Sending your request…");
  try {
    const fields = new FormData(bookingForm);
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        name: fields.get("name"),
        email: fields.get("email"),
        date: fields.get("date"),
        time: fields.get("time"),
        note: fields.get("note")
      })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not send your request.");
    setBookingStatus(result.message || "Your request is saved as pending. We’ll contact you to confirm.", "success");
    bookingForm.reset();
    timeSelect.replaceChildren(new Option("Choose a date first", ""));
    timeSelect.disabled = true;
    dateInput.min = localDate();
  } catch (error) {
    setBookingStatus(error.message, "error");
  } finally {
    submit.disabled = false;
  }
}

dateInput.min = localDate();
dateInput.addEventListener("change", loadAvailability);
bookingForm.addEventListener("submit", submitBooking);

fetch("/api/services", { headers: { Accept: "application/json" } })
  .then(async (response) => {
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load services.");
    renderServices(result);
  })
  .catch((error) => {
    servicesList.replaceChildren();
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = error.message;
    servicesList.append(message);
  });
