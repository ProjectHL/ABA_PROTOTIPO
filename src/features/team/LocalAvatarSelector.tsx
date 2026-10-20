'use client';
import { useEffect,useState } from 'react';
import { Avatar,Group,SimpleGrid,SegmentedControl,Stack,Text,UnstyledButton } from '@mantine/core';
const styles=[{label:'Personas',value:'people'},{label:'Iniciales',value:'initials'},{label:'Formas',value:'shapes'},{label:'Pixel Art',value:'pixel'}];
function bitmap(style:string,index:number,name:string) {
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas no disponible');
  const colors=['#228be6','#4c6ef5','#12b886','#7950f2','#f59f00','#e64980'];
  ctx.fillStyle=colors[index%colors.length];ctx.fillRect(0,0,128,128);ctx.fillStyle='#fff';
  if(style==='initials') {ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name.slice(0,2).toUpperCase()||'ABA',64,64);}
  else if(style==='people') {ctx.beginPath();ctx.arc(64,43,23,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(64,123,47,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle=colors[(index+2)%colors.length];ctx.fillRect(42,17,44,10);}
  else if(style==='shapes') {ctx.beginPath();ctx.arc(40,40,23,0,Math.PI*2);ctx.fill();ctx.fillStyle=colors[(index+3)%colors.length];ctx.fillRect(51,51,58,58);}
  else {for(let y=0;y<5;y++)for(let x=0;x<5;x++)if(((index+3)*(y+2)*(x+7))%5<3) {ctx.fillRect(24+x*16,24+y*16,14,14);ctx.fillRect(88-x*16,24+y*16,14,14);}}
  return canvas.toDataURL('image/png');
}
export function LocalAvatarSelector({name,currentSelection,onSelect}:{name:string;currentSelection?:string|null;onSelect:(file:File,selection:string)=>void}) {
  const [style,setStyle]=useState('people');
  const selected=currentSelection??null;
  const [preview,setPreview]=useState<{style:string;name:string;urls:string[]}|null>(null);
  const options=preview?.style===style&&preview.name===name?preview.urls:[];
  useEffect(()=>{
    const frame=window.requestAnimationFrame(()=>setPreview({style,name,urls:Array.from({length:12},(_,index)=>bitmap(style,index,name))}));
    return()=>window.cancelAnimationFrame(frame);
  },[style,name]);
  return <Stack><Group justify="center"><SegmentedControl data={styles} value={style} onChange={setStyle} size="xs"/></Group><SimpleGrid cols={4} spacing="md">{options.map((url,index)=>{
    const selection=`${style}:${index}`;const isSelected=selected===selection;
    return <UnstyledButton key={selection} aria-label={`Avatar ${style} ${index+1}`} aria-pressed={isSelected}
      style={{border:isSelected?'3px solid var(--mantine-color-blue-5)':'1px solid transparent',borderRadius:'50%',padding:4,transition:'transform 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.1)';}} onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';}}
      onClick={async()=>{const blob=await (await fetch(url)).blob();onSelect(new File([blob],`avatar-${style}-${index}.png`,{type:'image/png'}),selection);}}><Avatar src={url} size="lg" radius="100%"/></UnstyledButton>;
  })}</SimpleGrid><Text size="xs" c="dimmed" ta="center">Selecciona un avatar para previsualizarlo. Guarda el perfil para persistir el archivo privado.</Text></Stack>;
}
