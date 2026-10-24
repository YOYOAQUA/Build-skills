/* Everything you may want to change before launch lives here. */
window.WAI_CONFIG = {
  // Shown at the bottom of the shared story card.
  siteUrl: 'yoavyosha.co.il',

  // Where the call-to-action at the end of each report leads, by segment.
  // TODO: replace with the exact page of each product.
  links: {
    dad: 'https://yoavyosha.co.il',        // אבא + יש ילדים -> האבא מבצעי
    coaching: 'https://yoavyosha.co.il',   // גבר עצמאי / יזם -> ליווי אישי
    workshops: 'https://yoavyosha.co.il',  // כל שאר הגברים -> סדנאות גברים
    general: 'https://yoavyosha.co.il'     // נשים / אחר -> תוכן כללי
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

  // The Claude Code skill download, relative to the site root.
  skillZip: 'downloads/whatsapp-insights-skill.zip'
};
