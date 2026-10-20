'use client';
import type { ReactNode } from 'react';
import { RoleContext } from './roleContextDefinition';
import { IdentityProvider,useIdentity } from './IdentityContext';
import { OfflineProvider } from '@/modules/offline';
function AuthorizedRoles({children}:{children:ReactNode}) {
  const {identity,loading}=useIdentity();
  // Clinic-specific membership is server-validated; no latest-row heuristic or metadata role.
  const currentRole=identity?.active?.role??null;
  const value={currentRole,membershipRole:currentRole,loading,isAdmin:currentRole==='admin',isSupervisor:currentRole==='supervisor',isTherapist:currentRole==='therapist',isFamily:false};
  // Family/external effective scopes are supplied by A4's resource-based adapter, not guessed here.
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
export function RoleProvider({children}:{children:ReactNode}) {return <IdentityProvider><OfflineProvider><AuthorizedRoles>{children}</AuthorizedRoles></OfflineProvider></IdentityProvider>;}
