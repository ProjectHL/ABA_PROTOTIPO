"use client";

import { useEffect,useState } from 'react';
import { Alert,Modal,Text,Title,Button,Group,Stack,Card,Badge,List,ThemeIcon,Divider,SimpleGrid,Loader } from '@mantine/core';
import { Check,Sparkles,Building2,User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useIdentity } from '@/context/IdentityContext';
import { loadCommercialPageData } from '@/modules/commercial/commercial.server';
import type { CommercialPageData } from '@/modules/commercial/contracts';

interface UpgradePlanModalProps {
  opened:boolean; onClose:()=>void; onSelect?:(planVersionId:string)=>void;
}
export function UpgradePlanModal(props:UpgradePlanModalProps) {
  const {identity}=useIdentity();
  return <UpgradePlanContent key={`${props.opened}:${identity?.userId??''}:${identity?.active?.id??''}:${identity?.active?.role??''}`} {...props}/>;
}
function UpgradePlanContent({opened,onClose,onSelect}:UpgradePlanModalProps) {
  const {identity}=useIdentity();const router=useRouter();
  const [page,setPage]=useState<CommercialPageData|null>(null);const [error,setError]=useState('');
  const clinicId=identity?.active?.id;const actorId=identity?.userId;const admin=identity?.active?.role==='admin';
  const visiblePage=page&&page.clinicId===clinicId&&page.actorId===actorId?page:null;
  useEffect(()=>{
    if(!opened||!clinicId||!admin)return;
    let live=true;
    void loadCommercialPageData(clinicId).then(result=>{if(live)setPage(result);})
      .catch(cause=>{if(live)setError(cause instanceof Error?cause.message:'No se pudo cargar el catálogo.');});
    return()=>{live=false;};
  },[opened,clinicId,actorId,admin]);
  const choose=(id:string)=>{if(onSelect)onSelect(id);else{onClose();router.push('/plans?plan='+encodeURIComponent(id));}};
  return <Modal opened={opened} onClose={onClose} size="lg" padding="xl" centered
    title={<Group gap="xs"><Sparkles size={20} color="#228be6"/><Title order={3}>Mejora tu Plan</Title></Group>}>
    <Text c="dimmed" size="sm" mb="md">Catálogo interno de demostración: no procesa pagos ni emite documentos tributarios.</Text>
    {!admin?<Alert color="blue">La administración de tu clínica gestiona el plan y las plazas.</Alert>:<>
      {error&&<Alert color="red" mb="md">{error}</Alert>}
      {!visiblePage&&!error&&<Group justify="center" py="lg"><Loader size="sm"/><Text size="sm">Cargando catálogo autorizado…</Text></Group>}
      <SimpleGrid cols={{base:1,sm:2}} spacing="md">
        {visiblePage?.plans.map((plan,index)=><Card key={plan.planVersionId} withBorder padding="lg" radius="md"
          style={index===0?{borderColor:'var(--mantine-color-blue-6)',borderWidth:2}:{background:'var(--mantine-color-gray-0)'}}>
          <Stack gap="md" h="100%" justify="space-between"><div>
            <Group justify="space-between"><Badge color={index===0?'blue':'violet'} size="lg">{plan.name.toUpperCase()}</Badge>
              {index===0?<User size={20}/>:<Building2 size={20}/>}</Group>
            <Group align="flex-end" gap={4} mt="md"><Text size="xl" fw={700}>
              {new Intl.NumberFormat('es-CL',{style:'currency',currency:plan.price.currency,
                maximumFractionDigits:plan.price.minorUnitDigits}).format(plan.price.amountMinor/(10**plan.price.minorUnitDigits))}
              </Text><Text size="sm" c="dimmed">/{plan.price.period==='monthly'?'mes':'año'}</Text></Group>
            <Text size="xs" c="dimmed">Demostración · {plan.includedSeats} plazas incluidas</Text><Divider my="md"/>
            <List spacing="xs" size="sm" icon={<ThemeIcon color="blue" size={20} radius="xl"><Check size={12}/></ThemeIcon>}>
              {plan.features.map(feature=><List.Item key={feature}>{feature}</List.Item>)}</List>
          </div><Button fullWidth mt="md" variant={index===0?'filled':'outline'} color={index===0?'blue':'violet'}
            disabled={!plan.active||visiblePage.subscription?.status==='cancelled'} onClick={()=>choose(plan.planVersionId)}>
            {visiblePage.subscription?.plan.planVersionId===plan.planVersionId?'Gestionar plan vigente':'Seleccionar y confirmar'}
          </Button></Stack>
        </Card>)}
      </SimpleGrid>
      <Text size="xs" c="dimmed" ta="center" mt="xl">En el siguiente paso eliges las plazas y confirmas el cambio interno. El soporte se gestiona mediante tickets locales.</Text>
    </>}
  </Modal>;
}
