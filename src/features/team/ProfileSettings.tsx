'use client';
import { useEffect,useRef,useState } from 'react';
import { Alert,TextInput,Textarea,Button,Stack,Group,Avatar,FileButton,Text,Modal,SimpleGrid } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { Upload,UserCircle } from 'lucide-react';
import { profileInput,type ProfessionalProfile,type ProfileInput } from './identity.types';
import { profileAvatarUrl,uploadProfileAvatar } from './identity.server';
import { LocalAvatarSelector } from './LocalAvatarSelector';
type Operation={operationId:string;idempotencyKey:string};
interface ProfileSettingsProps {profile:ProfessionalProfile;clinicId:string;onSave:(values:ProfileInput,operation:Operation,expectedVersion:number,expectedClinicId:string)=>Promise<void>}
export function ProfileSettings({profile,clinicId,onSave}:ProfileSettingsProps) {
  const [avatarUrl,setAvatarUrl]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [avatarChoice,setAvatarChoice]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [opened,{open,close}]=useDisclosure(false);
  const pending=useRef<{fingerprint:string;operation:Operation}|null>(null);
  const baseVersion=useRef(profile.version);
  const baseClinic=useRef(clinicId);
  const form=useForm({initialValues:{name:profile.name,profession:profile.profession,title:profile.title,description:profile.description,phone:profile.phone,avatarObjectPath:profile.avatarObjectPath,avatarPreset:profile.avatarPreset},validate:values=>{const result=profileInput.safeParse(values);return result.success?{}:Object.fromEntries(result.error.issues.map(issue=>[issue.path[0],issue.message]));}});
  useEffect(()=>{
    let live=true;
    if(file) {const url=URL.createObjectURL(file);setAvatarUrl(url);return()=>{URL.revokeObjectURL(url);};}
    void profileAvatarUrl(form.values.avatarObjectPath).then(url=>{if(live)setAvatarUrl(url);}).catch(()=>{if(live)setAvatarUrl('');});
    return()=>{live=false;};
  },[file,form.values.avatarObjectPath]);
  const handleSubmit=async(values:ProfileInput)=>{
    setBusy(true);setError(null);
    try {
      let payload={...values};
      if(file) {const data=new FormData();data.set('avatar',file);payload={...payload,avatarObjectPath:await uploadProfileAvatar(profile.id,data,baseClinic.current)};form.setFieldValue('avatarObjectPath',payload.avatarObjectPath);setFile(null);}
      const fingerprint=JSON.stringify(payload);
      const operation=pending.current?.fingerprint===fingerprint?pending.current.operation:{operationId:crypto.randomUUID(),idempotencyKey:crypto.randomUUID()};
      pending.current={fingerprint,operation};
      await onSave(payload,operation,baseVersion.current,baseClinic.current);pending.current=null;
    } catch(cause) {setError(cause instanceof Error?cause.message:'El servidor no confirmó el cambio. Tus campos se conservan.');}
    finally {setBusy(false);}
  };
  return <><form onSubmit={form.onSubmit(handleSubmit)}><Stack gap="lg">
    {error&&<Alert color="red" title="Cambios sin confirmar" withCloseButton onClose={()=>setError(null)}>{error}</Alert>}
    <Group gap="lg"><Avatar src={avatarUrl} color={form.values.avatarPreset} size={100} radius="md">{profile.name.slice(0,2).toUpperCase()}</Avatar><div><Text size="sm" fw={500} mb="xs">Foto de Perfil</Text><Group gap="xs">
      <FileButton onChange={next=>{setFile(next);setAvatarChoice(null);setError(null);}} accept="image/png,image/jpeg">{props=><Button {...props} variant="default" size="xs" leftSection={<Upload size={14}/>}>Subir Foto</Button>}</FileButton>
      <Button variant="light" size="xs" leftSection={<UserCircle size={14}/>} onClick={open}>Elegir Avatar</Button>
    </Group><Text size="xs" c="dimmed" mt={4}>JPG/PNG hasta 5 MiB. La vista previa no significa guardado.</Text></div></Group>
    <TextInput label="Nombre Completo" required {...form.getInputProps('name')}/>
    <Group grow><TextInput label="Profesión" required {...form.getInputProps('profession')}/><TextInput label="Título" {...form.getInputProps('title')}/></Group>
    <Textarea label="Descripción Profesional" minRows={4} {...form.getInputProps('description')}/>
    <Group grow><TextInput label="Email de acceso" value={profile.email} readOnly description="El correo de Auth no se cambia al editar datos profesionales."/><TextInput label="Teléfono" {...form.getInputProps('phone')}/></Group>
    <Group justify="flex-end" mt="md"><Button type="submit" size="md" loading={busy}>Guardar Cambios</Button></Group>
  </Stack></form><Modal opened={opened} onClose={close} title="Elige tu avatar" centered><Stack><LocalAvatarSelector name={form.values.name} currentSelection={avatarChoice} onSelect={(next,selection)=>{setFile(next);setAvatarChoice(selection);close();}}/><SimpleGrid cols={4}>{(['blue','indigo','green','violet'] as const).map(color=><Button key={color} variant="subtle" onClick={()=>{form.setValues({avatarPreset:color,avatarObjectPath:null});setFile(null);setAvatarChoice(null);setAvatarUrl('');close();}}><Avatar color={color}>{profile.name.slice(0,2).toUpperCase()}</Avatar></Button>)}</SimpleGrid><Button variant="subtle" color="red" onClick={()=>{form.setFieldValue('avatarObjectPath',null);setFile(null);setAvatarChoice(null);setAvatarUrl('');close();}}>Retirar fotografía del perfil</Button></Stack></Modal></>;
}
