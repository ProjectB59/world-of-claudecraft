// i18n source catalog - the public Guide (docs/wiki) surface at /guide. A curated,
// branded front-of-house that explains the game, teaches the basics, and showcases
// classes, the bestiary, quests, and group content, separate from the community
// MediaWiki at /wiki. English values only; the 13 locale translations live in
// src/ui/i18n.locales/<lang>.ts (the runtime-authoritative overlays), filled by the
// maintainer at release.
//
// Assembled into `en` by ./index.ts under the `guide` namespace. Like hud_chrome.ts
// this module carries NO per-locale blocks (no `as const`), so a new Guide string is
// an English-only add that compiles; the translations live solely in the overlays.

export const guideStrings = {
  // Brand + shared chrome.
  brand: "World of ClaudeCraft",
  brandShort: "ClaudeCraft",
  tagline: "A classic-style MMO you play free in your browser.",
  skipToContent: "Skip to main content",
  loading: "Loading...",
  // Browser tab title: "{page} - {brand}". Hyphen separator (not an en dash).
  docTitle: "{page} - {brand}",

  // Top navigation + sidebar controls.
  nav: {
    overview: "Overview",
    howToPlay: "How to Play",
    classes: "Classes",
    bestiary: "Bestiary",
    world: "World",
    quests: "Quests",
    dungeons: "Dungeons & Raids",
    reference: "Reference",
    faq: "FAQ",
    playNow: "Play Now",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    primary: "Guide sections",
    topics: "Topics",
    onThisPage: "On this page",
    backToGame: "Back to the game",
  },

  // Sidebar section groupings.
  groups: {
    start: "Get Started",
    compendium: "Compendium",
    reference: "Reference",
  },

  // Footer.
  footer: {
    blurb: "An open-source, classic-style micro-MMO. Quest, group up, and explore a hand-built world, right in your browser.",
    playNow: "Play Now",
    github: "Source on GitHub",
    discord: "Join the Discord",
    communityWiki: "Community Wiki",
    rights: "World of ClaudeCraft",
  },

  // Language picker.
  language: {
    label: "Language",
    select: "Choose a language",
  },

  // Home / overview landing.
  home: {
    eyebrow: "Classic-style browser MMO",
    title: "World of ClaudeCraft",
    subtitle: "Quest, group up, and explore a hand-built world, free in your browser.",
    ctaPlay: "Play Now",
    ctaLearn: "How to Play",

    // "What is it" benefit trio.
    what: {
      heading: "A classic MMO, made to be picked up",
      pillarPlayTitle: "Play in your browser",
      pillarPlayBody: "No download, no launcher. Make a character and you are in the world in seconds, on desktop or phone.",
      pillarClassesTitle: "Nine classes, three roles",
      pillarClassesBody: "Tank, heal, or deal the damage. Every class plays the way its archetype should, with talents to make it yours.",
      pillarOpenTitle: "Free and open source",
      pillarOpenBody: "Free to play to the level cap, with the whole game open source. No pay to win, ever.",
    },

    // Class chooser teaser.
    classes: {
      heading: "Choose your class",
      sub: "Nine classic archetypes, each with its own feel and party role.",
      cta: "Explore the classes",
    },

    // World teaser.
    world: {
      heading: "Explore the world",
      sub: "One continuous land, three zones, from quiet valleys to frozen peaks.",
      levels: "Levels {min} to {max}",
      cta: "See the world",
      valeName: "Eastbrook Vale",
      valeBlurb: "Green hills and old woods where every adventure begins.",
      marshName: "Mirefen Marsh",
      marshBlurb: "Sunken fens and tide-worn ruins, home to murlocs and worse.",
      peaksName: "Thornpeak Heights",
      peaksBlurb: "Wind-scoured ridges climbing toward the realm's coldest dangers.",
    },

    // Group content teaser.
    group: {
      heading: "Group up for the hard parts",
      sub: "The world is soloable, but the best loot waits behind a good party.",
      dungeonsTitle: "Dungeons",
      dungeonsBody: "Instanced dives for a party of five, scaling with the zones around them.",
      raidTitle: "The raid",
      raidBody: "A ten-player capstone for those who reach the top of the world.",
      arenaTitle: "The arena",
      arenaBody: "Step into the Ashen Coliseum and prove yourself against other players.",
      cta: "Dungeons and Raids",
    },

    // Short FAQ.
    faq: {
      heading: "Good to know",
      q1: "Is it free to play?",
      a1: "Yes. The whole game is free to the level cap, and it is open source on GitHub.",
      q2: "Do I need a crypto wallet?",
      a2: "No. The game is fully playable without one. The optional community token only unlocks cosmetic flair and never affects power.",
      q3: "Can I play offline?",
      a3: "Yes. There is an instant single-player mode in your browser, plus the shared online realm.",
      q4: "How long to reach max level?",
      a4: "The cap is level {cap}, reached across three zones of quests, dungeons, and exploration.",
    },

    // Community call to action.
    community: {
      heading: "Join the realm",
      body: "Jump in now, or come say hello. The world is better with company.",
      play: "Play Now",
      discord: "Join the Discord",
      github: "Star on GitHub",
    },
  },

  // Generic placeholder for sections still being written (build scaffolding).
  placeholder: {
    note: "This part of the guide is on its way.",
  },

  // 404 / unknown route.
  notFound: {
    title: "We could not find that page",
    body: "The page you were looking for does not exist or may have moved.",
    home: "Back to the overview",
  },
};
