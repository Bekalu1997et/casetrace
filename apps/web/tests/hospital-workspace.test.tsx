import {render,screen,fireEvent,waitFor,renderHook} from "@testing-library/react";
import {afterEach,it,expect,vi} from "vitest";
import {Overview} from "@/features/dashboard/components/overview";
import {ImagingAssets} from "@/features/imaging/components/imaging-assets";
import {CaseLibrary,CaseDetail} from "@/features/cases/components/case-library";
import {ClinicalList} from "@/features/patients/components/clinical-list";
import {ChartLayout} from "@/features/patients/components/chart-layout";
import {EncounterDetail} from "@/features/encounters/components/encounter-detail";
import {DocumentDetail} from "@/features/documents/components/document-detail";
import {HospitalSource} from "@/features/evidence/components/hospital-source";
import {ImagePreview} from "@/features/documents/components/image-preview";
import {PdfPreview} from "@/features/documents/components/pdf-preview";
import {useHospitalAnchor} from "@/features/evidence/hooks/use-hospital-anchor";
import {catalogApi,parseCase} from "@/lib/api/catalog";
import {hospitalApi} from "@/lib/api/hospital";
import {investigationsApi} from "@/lib/api/investigations";
import type {CaseOverview,ClinicalRecord} from "@/types/hospital";
import type {Investigation} from "@/types/investigation";
vi.mock("next/navigation",()=>({usePathname:()=>"/patients/P/labs",useRouter:()=>({push:vi.fn()})}));
const pdf={numPages:2,getPage:vi.fn(async()=>({getViewport:({scale}:{scale:number})=>({width:600*scale,height:800*scale}),render:()=>({promise:Promise.resolve(),cancel:vi.fn()})}))};
vi.mock("pdfjs-dist",()=>({GlobalWorkerOptions:{workerSrc:""},getDocument:()=>({promise:Promise.resolve(pdf),destroy:vi.fn()})}));
const item:CaseOverview={case_id:"CASE-CONTROL",version:"1",patient_id:"P",display_name:"Synthetic patient",status:"imported",imported:true,dataset_status:"ready",counts:{encounters:2,documents:3},modalities:["application/pdf"],latest_encounter_at:null};
const page=<T,>(data:T[])=>({data,pagination:{limit:20,offset:0,total:data.length,has_more:false},meta:{request_id:"req"}});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
it("filters real case data and enables launch only for imported cases",async()=>{
 const list=vi.spyOn(catalogApi,"cases").mockResolvedValue(page([item,{...item,case_id:"ABSENT",status:"not_present",patient_id:null,display_name:null}]));
 render(<CaseLibrary/>);await screen.findByText("ABSENT");expect(screen.getAllByRole("button",{name:"Start investigation"})).toHaveLength(1);
 fireEvent.change(screen.getByLabelText("Availability"),{target:{value:"invalid"}});
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith(expect.objectContaining({status:"invalid",offset:"0"}),expect.any(AbortSignal)));
 expect(screen.getByRole("link",{name:"Open patient chart"})).toHaveAttribute("href","/patients/P");
});
it("shows unavailable case details without a launch action",async()=>{
 vi.spyOn(catalogApi,"case").mockResolvedValue({...item,status:"missing_assets",patient_id:null,display_name:null});render(<CaseDetail caseId={item.case_id}/>);
 expect(await screen.findByText("missing assets")).toBeVisible();expect(screen.queryByRole("button",{name:"Start investigation"})).not.toBeInTheDocument();
});
it("rejects malformed case counts rather than showing invented metrics",()=>{expect(()=>parseCase({...item,counts:{encounters:"7"}})).toThrow();});
it("keeps patient identity and deep clinical navigation in a shared layout",async()=>{
 vi.spyOn(hospitalApi,"patient").mockResolvedValue({id:"P",case_id:item.case_id,display_name:item.display_name!,synthetic_identifier:"SYN-P",date_of_birth:"1990-01-01",sex:"unknown",created_at:"2026-01-01T00:00:00Z"});
 vi.spyOn(catalogApi,"summary").mockResolvedValue({patient_id:"P",encounter_count:2,document_count:3,observation_count:0,medication_count:0,imaging_study_count:0,latest_encounter_at:null});
 render(<ChartLayout patientId="P"><p>Chart content</p></ChartLayout>);await screen.findByRole("heading",{name:"Synthetic patient"});
 expect(screen.getByRole("link",{name:"Laboratory"})).toHaveAttribute("aria-current","page");expect(screen.getByText(/Last encounter: Not documented/)).toBeVisible();
});
it("preserves zero results and sends combined filters before pagination",async()=>{
 const record:ClinicalRecord={id:"LAB",patient_id:"P",test_name:"Synthetic analyte",value_numeric:0,unit:"units",status:"final",specimen_collected_at:"2026-01-01T10:00:00+03:00",reported_at:"2026-01-02T11:00:00+03:00",source_document_id:"DOC",encounter_id:"ENC"};
 const list=vi.spyOn(hospitalApi,"records").mockResolvedValue(page([record]));render(<ClinicalList patientId="P" section="observations"/>);
 expect(await screen.findByText("0",{selector:"td"})).toBeVisible();expect(screen.getByRole("link",{name:"Source document DOC"})).toHaveAttribute("href","/patients/P/documents/DOC");
 fireEvent.change(screen.getByLabelText("Encounter ID"),{target:{value:"ENC"}});fireEvent.change(screen.getByLabelText("From (clinical date)"),{target:{value:"2026-01-01"}});fireEvent.click(screen.getByRole("button",{name:"Apply record filters"}));
 await waitFor(()=>expect(list).toHaveBeenLastCalledWith("P","observations",0,expect.any(AbortSignal),expect.objectContaining({encounter_id:"ENC",start_at:"2026-01-01T00:00:00Z"})));
});
it("refuses a foreign encounter before retrieving its associated records",async()=>{
 vi.spyOn(hospitalApi,"source").mockRejectedValue(new Error("Wrong patient"));const list=vi.spyOn(hospitalApi,"records");render(<EncounterDetail patientId="P" encounterId="FOREIGN"/>);
 expect(await screen.findByRole("alert")).toHaveTextContent("Wrong patient");expect(list).not.toHaveBeenCalled();
});
it("keeps document text separate from a missing original artifact",async()=>{
 vi.spyOn(hospitalApi,"source").mockResolvedValue({id:"DOC",patient_id:"P",title:"Original note",text_content:"Recorded source text",mime_type:"application/pdf",has_asset:false});
 render(<DocumentDetail patientId="P" documentId="DOC"/>);expect(await screen.findByText("Recorded source text")).toBeVisible();expect(screen.getByText("No original asset registered.")).toBeVisible();
});
it("rejects a foreign investigation before rendering source evidence",async()=>{
 vi.spyOn(investigationsApi,"get").mockResolvedValue({patient_id:"OTHER"} as Investigation);const source=vi.spyOn(hospitalApi,"source");render(<HospitalSource patientId="P" source={{type:"document",id:"DOC"}} investigation="INV" finding="F"/>);
 expect(await screen.findByRole("alert")).toHaveTextContent("does not belong");expect(source).not.toHaveBeenCalled();
});
it("rejects a finding that does not cite the selected source",async()=>{
 vi.spyOn(investigationsApi,"get").mockResolvedValue({patient_id:"P"} as Investigation);vi.spyOn(investigationsApi,"finding").mockResolvedValue({anchors:[]} as unknown as Awaited<ReturnType<typeof investigationsApi.finding>>);
 const {result}=renderHook(()=>useHospitalAnchor("P",{type:"document",id:"DOC"},"INV","F"));await waitFor(()=>expect(result.current.error).toContain("does not cite"));
});
it("renders actual PDF pages and changes the page and zoom",async()=>{
 vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});
 render(<PdfPreview url="blob:verified-pdf"/>);await waitFor(()=>expect(screen.queryByText("Rendering original PDF?")).not.toBeInTheDocument());
 expect(screen.getByRole("button",{name:"Previous PDF page"})).toBeDisabled();fireEvent.click(screen.getByRole("button",{name:"Next PDF page"}));
 await waitFor(()=>expect(pdf.getPage).toHaveBeenLastCalledWith(2));expect(screen.getByRole("button",{name:"Next PDF page"})).toBeDisabled();
 fireEvent.change(screen.getByLabelText("PDF zoom"),{target:{value:"1.5"}});await waitFor(()=>expect(document.querySelector("canvas")?.style.width).toBe("900px"));
});
it("labels synthetic images and supports actual zoom",()=>{render(<ImagePreview url="blob:verified-image" mimeType="image/png"/>);expect(screen.getByText(/not a diagnostic DICOM/)).toBeVisible();fireEvent.change(screen.getByLabelText("Image zoom"),{target:{value:"2"}});expect(document.querySelector("object")?.style.width).toBe("200%");});

it("dashboard metrics and recent investigations come from the read APIs",async()=>{
 vi.spyOn(catalogApi,"cases").mockResolvedValue(page([item]));
 vi.spyOn(hospitalApi,"patients").mockResolvedValue(page([]));
 vi.spyOn(catalogApi,"history").mockImplementation(async filters=>({items:[],total:filters?.status==="running"?2:filters?.status==="queued"?1:filters?.status==="completed"?4:0,limit:1,offset:0}));
 vi.stubEnv("NEXT_PUBLIC_API_URL","http://localhost:8000");vi.stubGlobal("fetch",vi.fn().mockImplementation(()=>Promise.resolve(new Response(JSON.stringify({status:"ok",version:"1",database:"connected"})))));
 render(<Overview/>);await waitFor(()=>expect(screen.getByText("Active investigations").parentElement).toHaveTextContent("3"));
 expect(screen.getByText("Available-case encounters").parentElement).toHaveTextContent("2");expect(screen.getByText("Available-case documents").parentElement).toHaveTextContent("3");
});
it("rejects incompatible laboratory units from malformed server series",async()=>{
 vi.stubEnv("NEXT_PUBLIC_API_URL","http://localhost:8000");vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{patient_id:"P",test_code:"X",points:[{observation_id:"A",collected_at:null,value_numeric:1,unit:"mg"},{observation_id:"B",collected_at:null,value_numeric:2,unit:"g"}]}}))));
 await expect(catalogApi.series("P","X")).rejects.toMatchObject({code:"INVALID_RESPONSE"});
});
it("navigates image identities without retaining the previously selected asset",async()=>{
 vi.spyOn(hospitalApi,"imagingAssets").mockResolvedValue(page([{id:"IMAGE-A",imaging_study_id:"STUDY",asset_type:"illustration",mime_type:"image/png"},{id:"IMAGE-B",imaging_study_id:"STUDY",asset_type:"illustration",mime_type:"image/png"}]));
 render(<ImagingAssets studyId="STUDY"/>);await screen.findByText(/IMAGE-A/);fireEvent.click(screen.getByRole("button",{name:"Next image"}));expect(screen.getByText(/IMAGE-B/)).toBeVisible();expect(screen.queryByText(/IMAGE-A/)).not.toBeInTheDocument();expect(screen.getByRole("button",{name:"Next image"})).toBeDisabled();
});

it("previous image crosses a pagination boundary to the actual preceding image",async()=>{
 vi.spyOn(hospitalApi,"imagingAssets").mockImplementation(async(_id,_signal,offset=0)=>({data:Array.from({length:offset===0?20:1},(_,index)=>({id:`IMG-${offset+index}`,imaging_study_id:"STUDY",asset_type:"illustration",mime_type:"image/png"})),pagination:{limit:20,offset,total:21,has_more:offset===0},meta:{request_id:"req"}}));
 render(<ImagingAssets studyId="STUDY"/>);await screen.findByText(/IMG-0 /);
 for(let index=0;index<20;index++)fireEvent.click(screen.getByRole("button",{name:"Next image"}));
 await screen.findByText(/IMG-20 /);fireEvent.click(screen.getByRole("button",{name:"Previous image"}));
 expect(await screen.findByText(/IMG-19 /)).toBeVisible();
});
