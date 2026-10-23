import accomplishments from "./templates/accomplishments.html";
import admin from "./templates/admin.html";
import arrangements from "./templates/arrangements.html";
import index from "./templates/index.html";
import { createWorker } from "./worker-handler.js";

export default createWorker({ index, accomplishments, arrangements, admin });
