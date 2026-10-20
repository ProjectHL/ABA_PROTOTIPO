import PlansPage from '@/views/PlansPage';
export default async function Page({searchParams}:{searchParams:Promise<{plan?:string}>}) {
  const {plan}=await searchParams;
  return <PlansPage initialPlan={plan}/>;
}
