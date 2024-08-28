import { CACHE_DIR } from "./lib.js";
import FissureDisplay from "./modules/fissure_display.js";
import RelicView from "./modules/relic_view.js";
const { execAsync, ensureDirectory } = Utils;

ensureDirectory(CACHE_DIR);
globalThis.reloadCss = async () => {
    await execAsync(`sass ${App.configDir}/scss/main.scss ${CACHE_DIR}/style.css`);
    App.resetCss();
    App.applyCss(`${CACHE_DIR}/style.css`);
};
reloadCss().catch(print);

App.addIcons(`${App.configDir}/assets/icons`);
App.config({
    stackTraceOnError: true,
    windows: [FissureDisplay(), RelicView()],
});
