import { copyFile, mkdir } from "node:fs/promises";
await mkdir(new URL("../public/",import.meta.url),{recursive:true});
await copyFile(new URL(import.meta.resolve("pdfjs-dist/build/pdf.worker.min.mjs")),new URL("../public/pdf.worker.min.mjs",import.meta.url));
