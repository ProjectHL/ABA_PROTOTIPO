'use client';
import { useEffect,useState } from 'react';
import { profileAvatarUrl } from './identity.server';
// Temporary global-professional avatar adapter; A2 will centralize attachment access.
export function useProfileAvatar(objectPath:string|null) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    let live=true;let timer:ReturnType<typeof setTimeout>|undefined;
    setUrl('');
    const renew=async()=>{try{const next=await profileAvatarUrl(objectPath);if(live)setUrl(next);}catch{if(live)setUrl('');}finally{if(live&&objectPath)timer=setTimeout(()=>void renew(),240_000);}};
    void renew();return()=>{live=false;if(timer)clearTimeout(timer);};
  },[objectPath]);
  return url;
}
