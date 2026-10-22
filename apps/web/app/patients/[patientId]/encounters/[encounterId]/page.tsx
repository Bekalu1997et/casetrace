import {EncounterDetail} from "@/features/encounters/components/encounter-detail";
export default async function Page({params}:{params:Promise<{patientId:string;encounterId:string}>}) {return <EncounterDetail {...await params}/>;}
