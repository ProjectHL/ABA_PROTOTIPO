import { z } from 'zod';
const common={id:z.uuid(),studentId:z.uuid(),title:z.string().min(1).max(240),subtitle:z.string().max(300),path:z.string().startsWith('/')};
export const searchResultSchema=z.discriminatedUnion('kind',[
  z.object({...common,kind:z.literal('student')}).strict(),
  z.object({...common,kind:z.literal('program'),programId:z.uuid()}).strict(),
  z.object({...common,kind:z.literal('document'),attachmentId:z.uuid()}).strict(),
]);
export const searchQuerySchema=z.string().trim().min(2).max(80).refine(value=>[...value].every(character=>{const code=character.codePointAt(0)??0;return code>=32&&code!==127;}),'La búsqueda contiene caracteres no permitidos');
export type SearchResult=z.infer<typeof searchResultSchema>;
