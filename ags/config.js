import { CACHE_DIR } from "./lib/misc.js";
import FissureDisplay from "./modules/fissure_display.js";
import RelicView from "./modules/relic_view.js";
const { execAsync, ensureDirectory } = Utils;

ensureDirectory(CACHE_DIR);
globalThis.reloadCss = () =>
    execAsync(`sass ${App.configDir}/scss/main.scss ${CACHE_DIR}/style.css`)
        .then(() => {
            App.resetCss();
            App.applyCss(`${CACHE_DIR}/style.css`);
        })
        .catch(print);
reloadCss();

App.addIcons(`${App.configDir}/assets/icons`);
App.config({
    stackTraceOnError: true,
    windows: [FissureDisplay(), RelicView()],
});
