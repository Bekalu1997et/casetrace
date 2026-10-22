import type { SourceRef } from "@/types/investigation";
export function hospitalSourceHref(patientId:string,source:SourceRef,investigationId?:string,findingId?:string) {
 const query=new URLSearchParams({source:source.id,source_type:source.type});
 if(investigationId) query.set("investigation",investigationId);
 if(findingId) query.set("finding",findingId);
 return `/patients/${encodeURIComponent(patientId)}/source?${query}`;
}
export const encounterHref=(patientId:string,id:string)=>`/patients/${encodeURIComponent(patientId)}/encounters/${encodeURIComponent(id)}`;
export const documentHref=(patientId:string,id:string)=>`/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(id)}`;
