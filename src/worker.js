import home from "./templates/home.html";
import accomplishments from "./templates/accomplishments.html";
import admin from "./templates/admin.html";
import arrangements from "./templates/arrangements.html";
import gallery from "./templates/gallery.html";
import projects from "./templates/projects.html";
import services from "./templates/services.html";
import { createWorker } from "./worker-handler.js";

export default createWorker({ home, projects, accomplishments, arrangements, services, gallery, admin });
