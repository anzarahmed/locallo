const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.localocustomer.app.localocustomer';

export const PLAY_STORE_URL: string = import.meta.env.VITE_PLAY_STORE_URL || DEFAULT_PLAY_STORE_URL;
export const APP_STORE_URL: string = import.meta.env.VITE_APP_STORE_URL || '';
