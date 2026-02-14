import { SimpleGrid, Avatar, UnstyledButton, Group, Stack, Text, SegmentedControl } from '@mantine/core';
import { useState } from 'react';

interface AvatarSelectorProps {
    currentAvatar: string;
    onSelect: (url: string) => void;
}

const AVATAR_STYLES = [
    { label: 'Personas', value: 'avataaars' },
    { label: 'Iniciales', value: 'initials' },
    { label: 'Formas', value: 'shapes' },
    { label: 'Pixel Art', value: 'pixel-art' },
];

const GENERATE_SEEDS = (count: number) => Array.from({ length: count }, (_, i) => `seed-${i + Math.floor(Math.random() * 1000)}`);

export function AvatarSelector({ currentAvatar, onSelect }: AvatarSelectorProps) {
    const [style, setStyle] = useState('avataaars');
    // Generamos semillas estables para evitar re-renders locos, pero variadas
    const [seeds] = useState(GENERATE_SEEDS(12));

    const getUrl = (style: string, seed: string) => `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;

    return (
        <Stack>
            <Group justify="center">
                <SegmentedControl
                    value={style}
                    onChange={setStyle}
                    data={AVATAR_STYLES}
                    size="xs"
                />
            </Group>

            <SimpleGrid cols={4} spacing="md">
                {seeds.map((seed) => {
                    const url = getUrl(style, seed);
                    const isSelected = currentAvatar === url;

                    return (
                        <UnstyledButton
                            key={seed}
                            onClick={() => onSelect(url)}
                            style={{
                                border: isSelected ? '3px solid var(--mantine-color-blue-5)' : '1px solid transparent',
                                borderRadius: '50%',
                                padding: '4px',
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            <Avatar src={url} size="lg" radius="100%" />
                        </UnstyledButton>
                    );
                })}
            </SimpleGrid>
            <Text size="xs" c="dimmed" ta="center">Selecciona un avatar para previsualizarlo</Text>
        </Stack>
    );
}
