import {DocumentDetail} from "@/features/documents/components/document-detail";
export default async function Page({params}:{params:Promise<{patientId:string;documentId:string}>}) {return <DocumentDetail {...await params}/>;}
