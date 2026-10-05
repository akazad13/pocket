// Runs in <head> before paint: resolves the saved theme ('pocket-theme' in localStorage) onto <html data-theme>.
export const THEME_KEY='pocket-theme',DARK_QUERY='(prefers-color-scheme: dark)';
export const themeScript=`try{var m=localStorage.getItem('${THEME_KEY}');var d=m==='dark'||(m!=='light'&&matchMedia('${DARK_QUERY}').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}`;
