import { createContext } from 'react';
import { type RoleContextType } from '@/types/authUtils';

export const RoleContext = createContext<RoleContextType | undefined>(undefined);
