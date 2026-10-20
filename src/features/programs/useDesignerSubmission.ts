'use client';

import { useRef, useState } from 'react';

/** One submission gate for both original designers. Transport failures keep values mounted. */
export function useDesignerSubmission(onClose:()=>void, closeBlocked:boolean, isDirty:()=>boolean) {
  const active=useRef(false);
  const [submitting,setSubmitting]=useState(false);
  const [saveError,setSaveError]=useState('');
  const submit=async(operation:()=>Promise<void>)=>{
    if(active.current)return;
    active.current=true;setSubmitting(true);setSaveError('');
    try{await operation();onClose();}
    catch(cause){setSaveError(cause instanceof Error?cause.message:'No se confirmó el programa. Tu diseño permanece abierto.');}
    finally{active.current=false;setSubmitting(false);}
  };
  const requestClose=()=>{
    if(active.current||closeBlocked){setSaveError('Resuelve la operación pendiente antes de cerrar el diseñador.');return;}
    if(isDirty()&&!window.confirm('Hay cambios locales sin guardar. ¿Descartarlos y cerrar el diseñador?'))return;
    onClose();
  };
  return {submit,requestClose,submitting,saveError};
}
