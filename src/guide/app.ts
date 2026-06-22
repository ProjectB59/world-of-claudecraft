// Guide app orchestrator. Owns the chrome + router, renders the matched page into the
// <main> landmark, and keeps title, active-nav, sidebar visibility, document language,
// and focus in sync on every navigation and language switch.

import {
  ensureLocaleLoaded, getLanguage, setLanguage, languageTag, t,
  type SupportedLanguage, type TranslationKey,
} from '../ui/i18n';
import { buildChrome, type GuideChrome } from './chrome';
import { GuideRouter } from './router';
import { matchRoute } from './routes';
import { pageFor, placeholderHtml, notFoundHtml, type PageContext } from './pages';

const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
function isRtl(tag: string): boolean {
  return RTL_LANGS.has(tag.split('-')[0]);
}

export class GuideApp {
  private readonly mount: HTMLElement;
  private readonly router: GuideRouter;
  private chrome!: GuideChrome;
  private chromeAbort: AbortController | null = null;

  constructor(mount: HTMLElement) {
    this.mount = mount;
    this.router = new GuideRouter((pathname) => this.navigate(pathname));
  }

  start(): void {
    this.rebuildChrome();
    this.applyDocumentLang();
    this.router.start();
  }

  private rebuildChrome(): void {
    this.chromeAbort?.abort();
    this.chromeAbort = new AbortController();
    this.chrome = buildChrome(
      this.mount,
      { onLanguageChange: (lang) => void this.changeLanguage(lang) },
      this.chromeAbort.signal,
    );
  }

  private applyDocumentLang(): void {
    const tag = languageTag(getLanguage());
    document.documentElement.lang = tag;
    document.documentElement.dir = isRtl(tag) ? 'rtl' : 'ltr';
  }

  private async changeLanguage(lang: SupportedLanguage): Promise<void> {
    await ensureLocaleLoaded(lang);
    setLanguage(lang);
    this.rebuildChrome();
    this.applyDocumentLang();
    this.navigate(window.location.pathname);
  }

  private navigate(pathname: string): void {
    const match = matchRoute(pathname);
    let titleKey: TranslationKey;
    if (!match) {
      this.chrome.mainEl.innerHTML = notFoundHtml();
      titleKey = 'guide.notFound.title';
      this.chrome.setActive('');
      this.chrome.setSidebarVisible(false);
      document.body.dataset.guideRoute = 'notfound';
    } else {
      const { route, params } = match;
      const ctx: PageContext = { params, sub: route.sub, titleKey: route.navKey };
      const page = pageFor(route.id);
      this.chrome.mainEl.innerHTML = page ? page.render(ctx) : placeholderHtml(ctx);
      titleKey = page?.titleKey ?? route.navKey;
      this.chrome.setActive(route.sub);
      this.chrome.setSidebarVisible(route.id !== 'home');
      document.body.dataset.guideRoute = route.id;
    }

    const pageTitle = t(titleKey);
    const brand = t('guide.brand');
    document.title = pageTitle === brand ? brand : t('guide.docTitle', { page: pageTitle, brand });
    this.chrome.closeMenu();
    this.focusMain(pathname);
  }

  private focusMain(pathname: string): void {
    const hashIndex = pathname.indexOf('#');
    const hash = hashIndex >= 0 ? pathname.slice(hashIndex) : '';
    if (hash.length > 1) {
      const target = this.chrome.mainEl.querySelector(hash);
      if (target) {
        (target as HTMLElement).scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
    // Move focus to the content region so keyboard and screen-reader users land on the
    // new page, not the top of the (unchanged) header.
    this.chrome.mainEl.focus({ preventScroll: true });
  }
}
