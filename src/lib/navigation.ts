'use client';

import {
    useParams as useNextParams,
    usePathname,
    useRouter,
    useSearchParams as useNextSearchParams,
} from 'next/navigation';

export function useNavigate() {
    const router = useRouter();
    return (href: string | number) => {
        if (typeof href === 'number') {
            router.back();
            return;
        }
        router.push(href);
    };
}

export function useLocation() {
    return { pathname: usePathname() };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
    return useNextParams() as T;
}

export function useSearchParams() {
    return useNextSearchParams();
}
