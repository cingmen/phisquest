/**
 * Metadata dokumen untuk locale aktif: judul tab, description, OG, dan Twitter.
 * Dipisahkan dari app.js agar bisa diuji tanpa DOM.
 */

const COPY = {
  id: {
    lang: 'id',
    title: 'PhishQuest — Kenali umpan sebelum kamu terhook.',
    description:
      'Game edukasi anti-phishing berbahasa Indonesia. Kenali red flag email, SMS, dan WhatsApp penipuan dalam kuis arcade yang seru.',
    meta: {
      'og:title': 'PhishQuest — Kenali umpan sebelum kamu terhook.',
      'og:description':
        'Game edukasi anti-phishing berbahasa Indonesia. 40 skenario email, SMS, dan WhatsApp untuk melatih instingmu.',
      'og:image:alt': 'PhishQuest — game edukasi anti-phishing berbahasa Indonesia.',
      'twitter:title': 'PhishQuest — Kenali umpan sebelum kamu terhook.',
      'twitter:description': '40 skenario phishing Indonesia dalam kuis arcade: main di web atau CLI.',
    },
  },
  en: {
    lang: 'en',
    title: 'PhishQuest — Spot the bait before you get hooked.',
    description:
      'Anti-phishing educational game with 40 realistic email, SMS, and WhatsApp scenarios. Spot red flags and build safer verification habits.',
    meta: {
      'og:title': 'PhishQuest — Spot the bait before you get hooked.',
      'og:description':
        'Anti-phishing educational game with 40 email, SMS, and WhatsApp scenarios to train your instincts.',
      'og:image:alt': 'PhishQuest — an anti-phishing educational game.',
      'twitter:title': 'PhishQuest — Spot the bait before you get hooked.',
      'twitter:description':
        '40 Indonesian phishing scenarios in an arcade quiz: play on the web or CLI.',
    },
  },
};

/**
 * Salinan metadata untuk locale. Locale selain `en` memakai bahasa Indonesia.
 * @param {string} locale - locale aktif.
 * @returns {{lang: string, title: string, description: string, meta: Record<string, string>}}
 */
export function documentMetadata(locale) {
  const copy = locale === 'en' ? COPY.en : COPY.id;
  return { ...copy, meta: { ...copy.meta } };
}

/**
 * Terapkan metadata ke dokumen.
 * @param {Document} doc - dokumen target.
 * @param {string} locale - locale aktif.
 */
export function applyDocumentMetadata(doc, locale) {
  const metadata = documentMetadata(locale);
  doc.documentElement.lang = metadata.lang;
  doc.title = metadata.title;
  const description = doc.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', metadata.description);
  for (const [property, content] of Object.entries(metadata.meta)) {
    const meta = doc.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
    if (meta) meta.setAttribute('content', content);
  }
}
