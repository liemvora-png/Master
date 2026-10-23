import home from "./templates/home.html";
import accomplishments from "./templates/accomplishments.html";
import admin from "./templates/admin.html";
import arrangements from "./templates/arrangements.html";
import projects from "./templates/projects.html";
import { createWorker } from "./worker-handler.js";

export default createWorker({ home, projects, accomplishments, arrangements, admin });
