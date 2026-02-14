import { createTheme } from '@mantine/core';

export const theme = createTheme({
    primaryColor: 'blue',
    defaultRadius: 'md',

    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    headings: {
        fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
        fontWeight: '700',
    },

    shadows: {
        xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },

    spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
    },

    components: {
        Button: {
            defaultProps: {
                fw: 500,
            },
            styles: {
                root: {
                    transition: 'all 0.2s ease',
                },
            },
        },
        Card: {
            defaultProps: {
                shadow: 'sm',
                withBorder: true,
            },
        },
        Modal: {
            defaultProps: {
                centered: true,
                overlayProps: {
                    backgroundOpacity: 0.55,
                    blur: 3,
                },
            },
        },
        TextInput: {
            styles: {
                label: {
                    fontWeight: 500,
                },
            },
        },
        Textarea: {
            styles: {
                label: {
                    fontWeight: 500,
                },
            },
        },
    },
});
