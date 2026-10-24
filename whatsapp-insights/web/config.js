/* Everything you may want to change before launch lives here. */
window.WAI_CONFIG = {
  // Shown at the bottom of the shared story card.
  siteUrl: 'yoavyosha.ravpage.co.il/mirror',

  // Where the call-to-action at the end of each report leads, by segment (decided 24.10.2026:
  // every man to the masterclass "גבר בתנועה", women and "other" to Instagram).
  links: {
    dad: 'https://yoavyosha.ravpage.co.il/masterclass?utm_source=wa-mirror&utm_medium=report&utm_campaign=dad',
    coaching: 'https://yoavyosha.ravpage.co.il/masterclass?utm_source=wa-mirror&utm_medium=report&utm_campaign=founder',
    workshops: 'https://yoavyosha.ravpage.co.il/masterclass?utm_source=wa-mirror&utm_medium=report&utm_campaign=men',
    general: 'https://www.instagram.com/yoav_yosha/'
  },

  // Lead capture. Pick ONE of the two modes below.
  // Mode A - Rav Messer form: paste the form's "action" URL and the input names
  // from the embed code Rav Messer gives you. The browser posts the form straight to
  // Rav Messer, and Rav Messer's thank-you page should be set to .../app.html
  ravMesser: {
    action: '',                 // e.g. the <form action="..."> URL from the embed code
    fields: {                   // the name="" of each input in that embed code
      name: '',
      email: '',
      gender: '',               // optional custom field
      kids: '',                 // optional custom field
      occupation: '',           // optional custom field
      source: ''                // optional: which reel brought them (?src=... in the link)
    },
    hidden: {}                  // any hidden inputs from the embed code, as name: value
  },
  // Mode B - webhook (Make / Zapier -> Rav Messer). The form is sent as JSON, then
  // the visitor continues to the tool.
  leadWebhook: '',

  // If the landing page and form live elsewhere (e.g. a Rav Messer landing page),
  // put its address here and index.html on this site sends visitors there.
  landingUrl: '',

  // The Claude Code skill download, relative to the site root.
  skillZip: 'downloads/whatsapp-insights-skill.zip'
};
