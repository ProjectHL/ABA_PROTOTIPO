'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, TextInput, Card, Text, Stack, Group, PasswordInput, Title } from '@mantine/core'
import { createFirstAdminAction } from '@/modules/auth/actions'
import { Command } from 'lucide-react'

const PASSWORD_DESCRIPTION = '12 caracteres, minúscula, mayúscula, número y símbolo.'
const meetsPolicy = (password: string) =>
    password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)

export default function SetupPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [organization, setOrganization] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [message, setMessage] = useState('')

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setMessage('')

        if (!meetsPolicy(password)) {
            setMessage(`La contraseña debe tener ${PASSWORD_DESCRIPTION}`)
            return
        }
        if (password !== confirm) {
            setMessage('Las contraseñas no coinciden.')
            return
        }

        setLoading(true)
        try {
            const result = await createFirstAdminAction({
                email: email.trim(),
                password,
                name: name.trim(),
                organization: organization.trim(),
            })
            if (!result.ok) {
                setMessage(result.message)
                setLoading(false)
                return
            }
            router.replace('/dashboard')
            router.refresh()
        } catch {
            setMessage('No se pudo completar la configuración. Revisa la conexión y vuelve a intentar.')
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--mantine-color-gray-0)',
            padding: '1rem'
        }}>
            <Group gap="xs" mb="xl">
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--mantine-color-blue-6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Command color="white" size={20} />
                </div>
                <Text size="xl" fw={700}>ABA Admin</Text>
            </Group>

            <Card shadow="xl" padding="lg" radius="md" withBorder style={{ width: '100%', maxWidth: '440px' }}>
                <Stack gap="xs" mb="md">
                    <Title order={1} size="h2">Configuración inicial</Title>
                    <Text size="sm" c="dimmed">
                        Esta instancia todavía no tiene usuarios. Crea la primera clínica y su administrador.
                    </Text>
                </Stack>

                <form onSubmit={handleSubmit}>
                    <Stack gap="md">
                        <TextInput
                            label="Nombre de la clínica"
                            placeholder="Clínica Demo"
                            required
                            maxLength={120}
                            value={organization}
                            onChange={event => setOrganization(event.currentTarget.value)}
                        />
                        <TextInput
                            label="Tu nombre"
                            placeholder="Nombre Apellido"
                            required
                            maxLength={160}
                            value={name}
                            onChange={event => setName(event.currentTarget.value)}
                        />
                        <TextInput
                            label="Correo"
                            type="email"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={event => setEmail(event.currentTarget.value)}
                        />
                        <PasswordInput
                            label="Contraseña"
                            autoComplete="new-password"
                            required
                            description={PASSWORD_DESCRIPTION}
                            value={password}
                            onChange={event => setPassword(event.currentTarget.value)}
                        />
                        <PasswordInput
                            label="Confirmar contraseña"
                            autoComplete="new-password"
                            required
                            value={confirm}
                            onChange={event => setConfirm(event.currentTarget.value)}
                        />
                        {message && <Alert color="red" withCloseButton onClose={() => setMessage('')}>{message}</Alert>}
                        <Button type="submit" loading={loading}>Crear administrador</Button>
                    </Stack>
                </form>
            </Card>
        </div>
    )
}
