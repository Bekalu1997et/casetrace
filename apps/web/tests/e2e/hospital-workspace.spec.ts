import {test,expect} from "@playwright/test";
import {writeFile} from "node:fs/promises";

test("real CASE-001 hospital records, multimodal sources and investigation round trip",async({page,request},info)=>{
 test.setTimeout(120000);
 const api=process.env.API_TEST_URL??"http://localhost:8000";
 await page.setViewportSize({width:1440,height:900});
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 const metrics:Record<string,number>={};
 const started=Date.now();await page.goto("/");await expect(page.getByRole("heading",{name:"Hospital Overview",exact:true})).toBeVisible();
 const catalog=await (await request.get(`${api}/api/hospital/v1/cases?status=imported`)).json();
 const patientList=await (await request.get(`${api}/api/hospital/v1/patients`)).json();
 await expect(page.locator(".hospital-metrics div").filter({has:page.getByText("Available cases",{exact:true})}).locator("dd")).toHaveText(String(catalog.pagination.total));
 await expect(page.locator(".hospital-metrics div").filter({has:page.getByText("Imported patients",{exact:true})}).locator("dd")).toHaveText(String(patientList.pagination.total));metrics.overview_ms=Date.now()-started;
 await page.screenshot({path:info.outputPath("hospital-overview.png"),fullPage:true});
 await page.getByRole("link",{name:"Browse Cases",exact:true}).click();await expect(page.getByRole("heading",{name:"Case Library",exact:true})).toBeVisible();
 await page.getByRole("heading",{name:"CASE-001",exact:true}).getByRole("link").click();await expect(page.getByRole("heading",{name:"Record inventory"})).toBeVisible();
 await page.screenshot({path:info.outputPath("case-overview.png"),fullPage:true});await page.getByRole("link",{name:"Open patient chart",exact:true}).click();
 await expect(page).toHaveURL(/\/patients\/[^/]+$/);
 const patientId=new URL(page.url()).pathname.split("/").at(-1)!;await expect(page.getByRole("navigation",{name:"Patient chart navigation"})).toBeVisible();
 await page.screenshot({path:info.outputPath("patient-chart.png"),fullPage:true});
 await page.getByRole("link",{name:"Encounters",exact:true}).click();
 const encounters=await (await request.get(`${api}/api/hospital/v1/patients/${patientId}/encounters`)).json();
 const documents=await (await request.get(`${api}/api/hospital/v1/patients/${patientId}/documents?limit=100`)).json();
 const note=documents.data.find((doc:{document_type:string;has_asset:boolean})=>doc.has_asset&&doc.document_type.includes("note"));
 await page.getByRole("link",{name:note.encounter_id,exact:true}).click();await expect(page.getByRole("heading",{name:"Encounter workspace",exact:true})).toBeVisible();
 const linked=await (await request.get(`${api}/api/hospital/v1/patients/${patientId}/documents?encounter_id=${note.encounter_id}`)).json();
 expect(linked.data.every((doc:{encounter_id:string})=>doc.encounter_id===note.encounter_id)).toBe(true);
 await page.screenshot({path:info.outputPath("encounter-detail.png"),fullPage:true});
 await page.getByRole("link",{name:note.id,exact:true}).click();await expect(page.getByText("Structured clinical text",{exact:true})).toBeVisible();
 const pdfStart=Date.now();await page.getByRole("button",{name:"Open original asset",exact:true}).click();
 await expect(page.getByText(/Rendering original PDF/)).toBeHidden({timeout:20000});await expect(page.getByRole("img",{name:"Original PDF page 1",exact:true})).toHaveAttribute("aria-busy","false");metrics.pdf_ready_ms=Date.now()-pdfStart;
 await expect(page.getByRole("button",{name:"Next PDF page"})).toBeDisabled();
 await page.getByLabel("PDF zoom",{exact:true}).selectOption("1.5");await expect(page.locator("canvas")).toHaveAttribute("width",/\d+/);await page.getByLabel("PDF zoom",{exact:true}).selectOption("fit");
 await page.screenshot({path:info.outputPath("original-pdf.png"),fullPage:true});
 await page.getByRole("link",{name:"Laboratory",exact:true}).click();await expect(page.getByRole("heading",{name:"Longitudinal laboratory trend",exact:true})).toBeVisible();
 const seriesCode=await page.getByLabel("Analyte code",{exact:true}).inputValue();const series=await (await request.get(`${api}/api/hospital/v1/patients/${patientId}/observations/series?test_code=${encodeURIComponent(seriesCode)}`)).json();
 await expect(page.getByRole("table").filter({has:page.getByText("Exact measurements (collection time)", {exact:true})}).locator("tbody tr")).toHaveCount(series.data.points.length);
 await page.screenshot({path:info.outputPath("laboratory-trend.png"),fullPage:true});await page.getByRole("link",{name:/^Source document /}).first().click();await expect(page.getByText("Original artifact",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Medications",exact:true}).click();await expect(page.getByText(/do not establish administration or adherence/)).toBeVisible();await page.screenshot({path:info.outputPath("medications.png"),fullPage:true});
 await page.getByRole("link",{name:/^Source document /}).first().click();await expect(page.getByText("Structured clinical text",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Imaging",exact:true}).click();await page.getByRole("button",{name:"Open original asset",exact:true}).first().click();await expect(page.getByText(/not a diagnostic DICOM/)).toBeVisible();await page.getByLabel("Image zoom",{exact:true}).selectOption("2");await page.screenshot({path:info.outputPath("imaging-viewer.png"),fullPage:true});
 await page.getByRole("link",{name:/^Source document /}).first().click();await expect(page.getByText("Original artifact",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Timeline",exact:true}).click();await expect(page.getByText(/Known instants only/)).toBeVisible();
 await page.getByLabel("Encounter ID",{exact:true}).fill(encounters.data[0].id);await page.getByRole("button",{name:"Apply record filters"}).click();
 await page.getByRole("link",{name:"Overview",exact:true}).last().click();
 await page.getByRole("button",{name:"Start investigation",exact:true}).click();await page.getByRole("button",{name:"Begin investigation",exact:true}).click();
 await expect(page.getByRole("link",{name:/^Open investigation report/})).toBeVisible({timeout:90000});
 const investigationId=new URL(page.url()).pathname.split("/").at(-1)!;
 const findings=await (await request.get(`${api}/api/investigations/${investigationId}/findings`)).json();
 const finding=findings.items.find((f:{anchors:{source:{type:string}}[]})=>f.anchors.some(a=>a.source.type==="document"));
 const anchor=finding.anchors.find((a:{source:{type:string}})=>a.source.type==="document");
 await page.getByRole("link",{name:`Hospital source ${anchor.source.id}`,exact:true}).first().click();
 await expect(page.getByText(/Cited field:/).first()).toBeVisible();await expect(page.getByText(/Investigation anchor/).first()).toBeVisible();
 const sourceUrl=page.url();await page.reload();await expect(page.getByText(/Cited field:/).first()).toBeVisible();expect(page.url()).toBe(sourceUrl);
 await page.screenshot({path:info.outputPath("source-anchor.png"),fullPage:true});await page.getByRole("link",{name:"Return to investigation report",exact:true}).click();await expect(page.getByRole("heading",{name:"Executive summary",exact:true})).toBeVisible();
 for(const width of [1440,1024,768,390]) {
  await page.setViewportSize({width,height:900});
  for(const route of ["/cases",`/patients/${patientId}/labs`,`/patients/${patientId}/documents/${note.id}`,`/patients/${patientId}/imaging`]) {
   await page.goto(route);await expect(page.getByRole("heading",{level:1})).toBeVisible();
   if(route==="/cases") await expect(page.getByRole("heading",{name:"CASE-001",exact:true})).toBeVisible();
   else if(route.endsWith("/labs")) await expect(page.getByRole("link",{name:/^LAB-/}).first()).toBeVisible();
   else if(route.endsWith("/imaging")) await expect(page.getByRole("link",{name:/^IMG-/}).first()).toBeVisible();
   else await expect(page.getByText("Original artifact",{exact:true})).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   if(width===390)await page.screenshot({path:info.outputPath(`mobile-${route.split("/").at(-1)}.png`),fullPage:true});
  }
 }
 await page.goto(`/patients/${patientId}/encounters/FOREIGN`);await expect(page.getByRole("alert")).toBeVisible();
 await writeFile(info.outputPath("performance.json"),JSON.stringify(metrics,null,2));expect(errors).toEqual([]);
});


test("original multi-page PDF controls use a registered backend artifact",async({page},info)=>{
 test.skip(process.env.PDF_CONTROL_SMOKE!=="1","Provision the isolated PDF viewer control with scripts/hospital_workspace_smoke_seed.py.");
 await page.goto("/patients/SYN-PDF-CONTROL/documents/DOC-PDF-CONTROL");
 await page.getByRole("button",{name:"Open original asset",exact:true}).click();
 await expect(page.getByLabel("PDF page",{exact:true})).toHaveAttribute("max","2");
 await page.getByRole("button",{name:"Next PDF page",exact:true}).click();
 await expect(page.getByRole("img",{name:"Original PDF page 2",exact:true})).toHaveAttribute("aria-busy","false");
 await expect(page.getByRole("button",{name:"Next PDF page",exact:true})).toBeDisabled();
 await page.getByLabel("PDF zoom",{exact:true}).selectOption("2");
 await expect(page.getByText(/Rendering original PDF/)).toBeHidden();
 expect(await page.locator("canvas").evaluate(canvas=>canvas.getBoundingClientRect().width)).toBeGreaterThan(1000);
 await page.screenshot({path:info.outputPath("two-page-original-pdf.png"),fullPage:true});
 await page.getByRole("button",{name:"Previous PDF page",exact:true}).click();
 await expect(page.getByRole("img",{name:"Original PDF page 1",exact:true})).toBeVisible();
 await page.getByLabel("PDF zoom",{exact:true}).selectOption("fit");
});
