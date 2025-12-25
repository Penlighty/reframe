/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Mapping "Indigo" (Current Primary) to New Lime Green Theme
                indigo: {
                    50: '#f4fce3',
                    100: '#e5f8b9',
                    200: '#d1f185',
                    300: '#b7e64c',
                    400: '#a3d95d', // Main Lime (matched visually)
                    500: '#84cc16', // Slightly darker for contrast
                    600: '#65a30d',
                    700: '#4d7c0f',
                    800: '#3f6212',
                    900: '#365314',
                    950: '#1a2e05',
                },
                // Mapping "Purple" (Secondary) to New Orange Theme
                purple: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#f2a93b', // Main Orange (matched visually)
                    500: '#f97316',
                    600: '#ea580c',
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                    950: '#431407',
                },
                // Custom darks if needed, or stick to Zinc
                'premium-dark': '#050505',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
            }
        },
    },
    plugins: [],
}
