// The hackathon build exposes one focused journey. The wider platform remains
// available for development via VITE_APP_MODE=full, without deleting its data.
export const IS_HACKATHON_DEMO = import.meta.env.VITE_APP_MODE !== 'full';
