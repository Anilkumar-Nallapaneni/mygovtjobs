/**
 * Curated directory of OFFICIAL Government recruitment portals.
 *
 * Each entry links to a real, stable government site. URLs are intentionally
 * deep-linked to the page most relevant to job seekers ("What's New",
 * "Recruitment", "Careers", "Latest Notifications") rather than the bare
 * homepage where possible.
 *
 * Schema:
 *   id         – stable string id
 *   name       – display name
 *   url        – primary landing page
 *   latestUrl  – deep-link to notifications/recruitment listing (falls back to url)
 *   rssUrl     – optional RSS/Atom feed (skips HTML scrape when set)
 *   scope      – "central" | "state" | "uniform" | "psu" | "bank"
 *   category   – matches CATS[].id where applicable (upsc, ssc, railways, …)
 *   stateIds   – array of STATES[].id this portal serves; ["all"] for nationwide
 *   notes      – short freeform note
 */

const u = (url, latestUrl) => ({ url, latestUrl: latestUrl || url });

export const OFFICIAL_SITES = [
  /* ---------- CENTRAL — National employment bulletin ---------- */
  {
    id: "employment-news",
    name: "Employment News (Government of India)",
    ...u("https://employmentnews.gov.in/", "https://employmentnews.gov.in/"),
    scope: "central",
    category: "general",
    stateIds: ["all"],
    notes: "Official weekly employment bulletin — RSS in site overrides",
  },

  /* ---------- CENTRAL — Commissions & ministries ---------- */
  { id: "upsc",          name: "Union Public Service Commission (UPSC)",       ...u("https://upsc.gov.in/", "https://upsc.gov.in/whats-new"),                              scope: "central", category: "upsc",     stateIds: ["all"] },
  { id: "ssc",           name: "Staff Selection Commission (SSC)",             ...u("https://ssc.gov.in/", "https://ssc.gov.in/home/notice-board"),                       scope: "central", category: "ssc",      stateIds: ["all"] },
  { id: "ibps",          name: "Institute of Banking Personnel Selection",     ...u("https://www.ibps.in/", "https://www.ibps.in/notification"),                           scope: "central", category: "banking",  stateIds: ["all"] },
  { id: "rbi",           name: "Reserve Bank of India — Careers",              ...u("https://www.rbi.org.in/", "https://www.rbi.org.in/Scripts/Opportunities.aspx"),       scope: "central", category: "banking",  stateIds: ["all"] },
  { id: "sebi",          name: "Securities and Exchange Board of India",       ...u("https://www.sebi.gov.in/", "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListingAll=yes&search=&category=Notifications"), scope: "central", category: "banking", stateIds: ["all"] },
  { id: "lic",           name: "Life Insurance Corporation — Careers",         ...u("https://licindia.in/", "https://licindia.in/web/guest/lic-s-careers"),                scope: "central", category: "banking",  stateIds: ["all"] },
  { id: "epfo",          name: "Employees' Provident Fund Organisation",       ...u("https://www.epfindia.gov.in/", "https://www.epfindia.gov.in/site_en/Recruitment.php"), scope: "central", category: "psu",      stateIds: ["all"] },
  { id: "esic",          name: "Employees' State Insurance Corporation",       ...u("https://www.esic.gov.in/", "https://www.esic.gov.in/recruitments"),                   scope: "central", category: "health",   stateIds: ["all"] },
  { id: "niti",          name: "NITI Aayog",                                   ...u("https://www.niti.gov.in/", "https://www.niti.gov.in/whats-new"),                      scope: "central", category: "psu",      stateIds: ["all"] },

  /* ---------- CENTRAL — Defence research / atomic / space ---------- */
  { id: "isro",          name: "Indian Space Research Organisation (ISRO)",    ...u("https://www.isro.gov.in/", "https://www.isro.gov.in/Careers.html"),                   scope: "central", category: "defence",  stateIds: ["all"] },
  { id: "drdo",          name: "Defence Research & Development Organisation",  ...u("https://www.drdo.gov.in/", "https://www.drdo.gov.in/"),                               scope: "central", category: "defence",  stateIds: ["all"] },
  { id: "barc",          name: "Bhabha Atomic Research Centre (BARC)",         ...u("https://www.barc.gov.in/", "https://www.barc.gov.in/careers/"),                       scope: "central", category: "defence",  stateIds: ["all"] },
  { id: "npcil",         name: "Nuclear Power Corporation of India (NPCIL)",   ...u("https://www.npcil.nic.in/", "https://www.npcil.nic.in/content/331_1_Recruitments.aspx"), scope: "psu",   category: "psu",      stateIds: ["all"] },

  /* ---------- CENTRAL — Railways ---------- */
  { id: "rrb-cdg",       name: "Railway Recruitment Board (RRB) — Chandigarh", ...u("https://www.rrbcdg.gov.in/", "https://www.rrbcdg.gov.in/"),                            scope: "central", category: "railways", stateIds: ["all"] },
  { id: "rrb-ald",       name: "Railway Recruitment Board (RRB) — Prayagraj",  ...u("https://www.rrbald.gov.in/", "https://www.rrbald.gov.in/"),                            scope: "central", category: "railways", stateIds: ["all"] },
  { id: "rrb-mumbai",    name: "Railway Recruitment Board (RRB) — Mumbai",     ...u("https://rrbmumbai.gov.in/", "https://rrbmumbai.gov.in/"),                              scope: "central", category: "railways", stateIds: ["all"] },
  { id: "rrcb",          name: "Railway Recruitment Cells (RRC)",              ...u("https://www.rrcb.gov.in/", "https://www.rrcb.gov.in/"),                                scope: "central", category: "railways", stateIds: ["all"] },
  { id: "ircon",         name: "IRCON International",                          ...u("https://ircon.org/", "https://ircon.org/index.php/career"),                            scope: "psu",     category: "railways", stateIds: ["all"] },

  /* ---------- CENTRAL — Defence (uniformed services) ---------- */
  { id: "army",          name: "Indian Army — Join Indian Army",               ...u("https://joinindianarmy.nic.in/", "https://joinindianarmy.nic.in/"),                    scope: "uniform", category: "defence",  stateIds: ["all"] },
  { id: "navy",          name: "Indian Navy — Join Indian Navy",               ...u("https://www.joinindiannavy.gov.in/", "https://www.joinindiannavy.gov.in/"),            scope: "uniform", category: "defence", stateIds: ["all"] },
  { id: "iaf",           name: "Indian Air Force — Careers",                   ...u("https://indianairforce.nic.in/", "https://careerindianairforce.cdac.in/"),              scope: "uniform", category: "defence",  stateIds: ["all"] },
  { id: "afcat",         name: "AFCAT — IAF officer entry",                    ...u("https://afcat.cdac.in/", "https://afcat.cdac.in/"),                                    scope: "uniform", category: "defence",  stateIds: ["all"] },
  { id: "coast-guard",   name: "Indian Coast Guard — Recruitment",             ...u("https://joinindiancoastguard.cdac.in/", "https://joinindiancoastguard.cdac.in/"),       scope: "uniform", category: "defence",  stateIds: ["all"] },

  /* ---------- CENTRAL — Paramilitary & federal police ---------- */
  { id: "bsf",           name: "Border Security Force (BSF) — Recruitment",    ...u("https://rectt.bsf.gov.in/", "https://rectt.bsf.gov.in/"),                              scope: "uniform", category: "police",   stateIds: ["all"] },
  { id: "crpf",          name: "Central Reserve Police Force (CRPF)",          ...u("https://crpf.gov.in/", "https://crpf.gov.in/recruitment.htm"),                         scope: "uniform", category: "police",   stateIds: ["all"] },
  { id: "cisf",          name: "Central Industrial Security Force (CISF)",     ...u("https://www.cisf.gov.in/", "https://www.cisf.gov.in/recruitment/"),                    scope: "uniform", category: "police",   stateIds: ["all"] },
  { id: "itbp",          name: "Indo-Tibetan Border Police (ITBP)",            ...u("https://recruitment.itbpolice.nic.in/", "https://recruitment.itbpolice.nic.in/"),       scope: "uniform", category: "police",   stateIds: ["all"] },
  { id: "ssb",           name: "Sashastra Seema Bal (SSB)",                    ...u("https://www.ssb.nic.in/", "https://ssbrectt.gov.in/"),                                  scope: "uniform", category: "police",   stateIds: ["all"] },
  { id: "ib",            name: "Intelligence Bureau (IB) — MHA",               ...u("https://www.mha.gov.in/", "https://www.mha.gov.in/en/notifications/vacancies"),         scope: "uniform", category: "police",   stateIds: ["all"] },

  /* ---------- CENTRAL — Education / health ---------- */
  { id: "ugc",           name: "University Grants Commission (UGC)",           ...u("https://www.ugc.gov.in/", "https://www.ugc.gov.in/page/Notices.aspx"),                  scope: "central", category: "teaching", stateIds: ["all"] },
  { id: "ncert",         name: "NCERT",                                        ...u("https://ncert.nic.in/", "https://ncert.nic.in/recruitment.php"),                        scope: "central", category: "teaching", stateIds: ["all"] },
  { id: "ctet",          name: "CBSE — CTET",                                  ...u("https://ctet.nic.in/", "https://ctet.nic.in/"),                                        scope: "central", category: "teaching", stateIds: ["all"] },
  { id: "kvs",           name: "Kendriya Vidyalaya Sangathan",                 ...u("https://kvsangathan.nic.in/", "https://kvsangathan.nic.in/"),                          scope: "central", category: "teaching", stateIds: ["all"] },
  { id: "nvs",           name: "Navodaya Vidyalaya Samiti",                    ...u("https://navodaya.gov.in/", "https://navodaya.gov.in/nvs/en/Recruitment-Notice/Recruitment/"), scope: "central", category: "teaching", stateIds: ["all"] },
  { id: "aiims",         name: "AIIMS New Delhi — Recruitment",                ...u("https://www.aiims.edu/", "https://www.aiims.edu/index.php/en/recruitment-cell"),       scope: "central", category: "health",   stateIds: ["all"] },

  /* ---------- CENTRAL — Banks ---------- */
  { id: "sbi",           name: "State Bank of India — Careers",                ...u("https://sbi.co.in/", "https://sbi.co.in/web/careers/current-openings"),                scope: "bank",    category: "banking",  stateIds: ["all"] },
  { id: "bob",           name: "Bank of Baroda — Careers",                     ...u("https://www.bankofbaroda.in/", "https://www.bankofbaroda.in/career"),                  scope: "bank",    category: "banking",  stateIds: ["all"] },
  { id: "pnb",           name: "Punjab National Bank — Careers",               ...u("https://www.pnbindia.in/", "https://www.pnbindia.in/Recruitments.html"),               scope: "bank",    category: "banking",  stateIds: ["all"] },
  { id: "canara",        name: "Canara Bank — Careers",                        ...u("https://canarabank.com/", "https://canarabank.com/pages/recruitment"),                 scope: "bank",    category: "banking",  stateIds: ["all"] },
  { id: "uco",           name: "UCO Bank — Careers",                           ...u("https://www.ucobank.com/", "https://www.ucobank.com/english/career-notification.aspx"), scope: "bank",   category: "banking",  stateIds: ["all"] },
  { id: "nabard",        name: "NABARD — Careers",                             ...u("https://www.nabard.org/", "https://www.nabard.org/career.aspx"),                       scope: "bank",    category: "banking",  stateIds: ["all"] },

  /* ---------- CENTRAL — PSUs ---------- */
  { id: "ongc",          name: "ONGC — Careers",                               ...u("https://ongcindia.com/", "https://ongcindia.com/web/eng/careers"),                     scope: "psu",     category: "psu",      stateIds: ["all"] },
  { id: "iocl",          name: "Indian Oil Corporation — Careers",             ...u("https://iocl.com/", "https://iocl.com/job-search"),                                    scope: "psu",     category: "psu",      stateIds: ["all"] },
  { id: "bpcl",          name: "Bharat Petroleum — Careers",                   ...u("https://www.bharatpetroleum.in/", "https://bharatpetroleum.in/About-BPCL/Careers/Careers.aspx"), scope: "psu", category: "psu",   stateIds: ["all"] },
  { id: "hpcl",          name: "Hindustan Petroleum — Careers",                ...u("https://www.hindustanpetroleum.com/", "https://hindustanpetroleum.com/careersopportunities"), scope: "psu", category: "psu",  stateIds: ["all"] },
  { id: "gail",          name: "GAIL India — Careers",                         ...u("https://gailonline.com/", "https://gailonline.com/CRcareer.html"),                     scope: "psu",     category: "psu",      stateIds: ["all"] },
  { id: "ntpc",          name: "NTPC — Careers",                               ...u("https://www.ntpc.co.in/", "https://www.ntpc.co.in/en/career"),                        scope: "psu",     category: "psu",      stateIds: ["all"] },
  { id: "bhel",          name: "BHEL — Careers",                               ...u("https://www.bhel.com/", "https://careers.bhel.in/"),                                  scope: "psu",     category: "psu",      stateIds: ["all"] },
  { id: "hal",           name: "Hindustan Aeronautics (HAL)",                  ...u("https://hal-india.co.in/", "https://hal-india.co.in/Careers/M__93"),                   scope: "psu",     category: "defence",  stateIds: ["all"] },
  { id: "bel",           name: "Bharat Electronics (BEL)",                     ...u("https://bel-india.in/", "https://bel-india.in/careers/"),                              scope: "psu",     category: "defence",  stateIds: ["all"] },
  { id: "sail",          name: "Steel Authority of India (SAIL)",              ...u("https://sail.co.in/", "https://sail.co.in/en/career/career-opportunities"),            scope: "psu",     category: "psu",      stateIds: ["all"] },

  /* ---------- CENTRAL — Other ---------- */
  { id: "ies",           name: "Indian Statistical Service / ESE",             ...u("https://upsc.gov.in/", "https://upsc.gov.in/whats-new"),                              scope: "central", category: "upsc",     stateIds: ["all"] },
  { id: "delhi-police",  name: "Delhi Police — Recruitment",                   ...u("https://www.delhipolice.gov.in/", "https://www.delhipolice.gov.in/recruitment"),       scope: "uniform", category: "police",   stateIds: ["dl"] },

  /* ---------- STATE PUBLIC SERVICE COMMISSIONS ---------- */
  { id: "psc-ap",        name: "Andhra Pradesh PSC (APPSC)",                   ...u("https://psc.ap.gov.in/", "https://psc.ap.gov.in/"),                                    scope: "state",   category: "state",    stateIds: ["ap"] },
  { id: "psc-as",        name: "Assam PSC (APSC)",                             ...u("https://apsc.nic.in/", "https://apsc.nic.in/notifications"),                           scope: "state",   category: "state",    stateIds: ["as"] },
  { id: "psc-br",        name: "Bihar PSC (BPSC)",                             ...u("https://bpsc.bihar.gov.in/", "https://bpsc.bihar.gov.in/Notices.html"),                scope: "state",   category: "state",    stateIds: ["br"] },
  { id: "psc-cg",        name: "Chhattisgarh PSC (CGPSC)",                     ...u("https://psc.cg.gov.in/", "https://psc.cg.gov.in/"),                                    scope: "state",   category: "state",    stateIds: ["cg"] },
  { id: "psc-ga",        name: "Goa PSC",                                      ...u("https://gpsc.goa.gov.in/", "https://gpsc.goa.gov.in/"),                                scope: "state",   category: "state",    stateIds: ["ga"] },
  { id: "psc-gj",        name: "Gujarat PSC (GPSC)",                           ...u("https://gpsc.gujarat.gov.in/", "https://gpsc.gujarat.gov.in/"),                        scope: "state",   category: "state",    stateIds: ["gj"] },
  { id: "psc-hr",        name: "Haryana PSC (HPSC)",                           ...u("https://hpsc.gov.in/", "https://hpsc.gov.in/en-us/Recruitment"),                           scope: "state",   category: "state",    stateIds: ["hr"] },
  { id: "psc-hp",        name: "Himachal Pradesh PSC (HPPSC)",                 ...u("https://hppsc.hp.gov.in/", "https://hppsc.hp.gov.in/hppsc/"),                          scope: "state",   category: "state",    stateIds: ["hp"] },
  { id: "psc-jk",        name: "Jammu & Kashmir PSC (JKPSC)",                  ...u("https://jkpsc.nic.in/", "https://jkpsc.nic.in/Notifications.html"),                    scope: "state",   category: "state",    stateIds: ["jk"] },
  { id: "psc-jh",        name: "Jharkhand PSC (JPSC)",                         ...u("https://jpsc.gov.in/", "https://jpsc.gov.in/"),                                        scope: "state",   category: "state",    stateIds: ["jh"] },
  { id: "psc-ka",        name: "Karnataka PSC (KPSC)",                         ...u("https://kpsc.kar.nic.in/", "https://kpsc.kar.nic.in/notifications.html"),              scope: "state",   category: "state",    stateIds: ["ka"] },
  { id: "psc-kl",        name: "Kerala PSC",                                   ...u("https://www.keralapsc.gov.in/", "https://www.keralapsc.gov.in/notifications"),         scope: "state",   category: "state",    stateIds: ["kl"] },
  { id: "psc-mp",        name: "Madhya Pradesh PSC (MPPSC)",                   ...u("https://mppsc.mp.gov.in/", "https://mppsc.mp.gov.in/news.aspx"),                       scope: "state",   category: "state",    stateIds: ["mp"] },
  { id: "psc-mh",        name: "Maharashtra PSC (MPSC)",                       ...u("https://mpsc.gov.in/", "https://mpsc.gov.in/english/notices"),                         scope: "state",   category: "state",    stateIds: ["mh"] },
  { id: "psc-mz",        name: "Mizoram PSC",                                  ...u("https://mpsc.mizoram.gov.in/", "https://mpsc.mizoram.gov.in/"),                        scope: "state",   category: "state",    stateIds: ["ne"] },
  { id: "psc-nl",        name: "Nagaland PSC (NPSC)",                          ...u("https://npsc.co.in/", "https://npsc.co.in/recruitment.html"),                          scope: "state",   category: "state",    stateIds: ["ne"] },
  { id: "psc-od",        name: "Odisha PSC (OPSC)",                            ...u("https://opsc.gov.in/", "https://opsc.gov.in/?LK=NRA"),                                 scope: "state",   category: "state",    stateIds: ["od"] },
  { id: "psc-pb",        name: "Punjab PSC (PPSC)",                            ...u("https://ppsc.gov.in/", "https://ppsc.gov.in/Notifications.aspx"),                      scope: "state",   category: "state",    stateIds: ["pb"] },
  { id: "psc-rj",        name: "Rajasthan PSC (RPSC)",                         ...u("https://rpsc.rajasthan.gov.in/", "https://rpsc.rajasthan.gov.in/advertisements"),      scope: "state", category: "state", stateIds: ["rj"] },
  { id: "psc-sk",        name: "Sikkim PSC (SPSC)",                            ...u("https://spscskm.gov.in/", "https://spscskm.gov.in/"),                                  scope: "state",   category: "state",    stateIds: ["sk"] },
  { id: "psc-tn",        name: "Tamil Nadu PSC (TNPSC)",                       ...u("https://www.tnpsc.gov.in/", "https://www.tnpsc.gov.in/"),                             scope: "state", category: "state", stateIds: ["tn"] },
  { id: "psc-tg",        name: "Telangana PSC (TSPSC)",                        ...u("https://tspsc.gov.in/", "https://tspsc.gov.in/"),                                      scope: "state",   category: "state",    stateIds: ["tg"] },
  { id: "psc-tr",        name: "Tripura PSC (TPSC)",                           ...u("https://tpsc.tripura.gov.in/", "https://tpsc.tripura.gov.in/"),                        scope: "state",   category: "state",    stateIds: ["ne"] },
  { id: "psc-up",        name: "Uttar Pradesh PSC (UPPSC)",                    ...u("https://uppsc.up.nic.in/", "https://uppsc.up.nic.in/Notifications.aspx"),              scope: "state",   category: "state",    stateIds: ["up"] },
  { id: "psc-uk",        name: "Uttarakhand PSC (UKPSC)",                      ...u("https://psc.uk.gov.in/", "https://psc.uk.gov.in/"),                                    scope: "state",   category: "state",    stateIds: ["uk"] },
  { id: "psc-wb",        name: "West Bengal PSC (WBPSC)",                      ...u("https://wbpsc.gov.in/", "https://wbpsc.gov.in/"),                                      scope: "state",   category: "state",    stateIds: ["wb"] },
  { id: "psc-ar",        name: "Arunachal Pradesh PSC (APPSC)",                ...u("https://appsc.gov.in/Index/institute_index/ins/RECINS001", "https://appsc.gov.in/Index/institute_index/ins/RECINS001"), scope: "state", category: "state", stateIds: ["ne"] },
  { id: "psc-mn",        name: "Manipur PSC",                                  ...u("https://mpscmanipur.gov.in/", "https://mpscmanipur.gov.in/"),                          scope: "state",   category: "state",    stateIds: ["ne"] },
  { id: "psc-ml",        name: "Meghalaya PSC",                                ...u("https://megpsc.gov.in/", "https://megpsc.gov.in/"),                                    scope: "state",   category: "state",    stateIds: ["ne"] },

  /* ---------- STATE — Subordinate / staff selection boards ---------- */
  { id: "ssb-up",        name: "UP Subordinate Services Selection Comm (UPSSSC)", ...u("https://upsssc.gov.in/", "https://upsssc.gov.in/AllNotifications.aspx"),             scope: "state", category: "state",    stateIds: ["up"] },
  { id: "ssb-mh",        name: "Maharashtra State Selection Board (MahaPariksha)",...u("https://mahapariksha.gov.in/", "https://mahapariksha.gov.in/"),                      scope: "state", category: "state",    stateIds: ["mh"] },
  { id: "ssb-tn",        name: "TN Teachers Recruitment Board (TRB)",          ...u("https://trb.tn.gov.in/", "https://trb.tn.gov.in/"),                                    scope: "state",   category: "teaching", stateIds: ["tn"] },
  { id: "ssb-rj",        name: "Rajasthan Staff Selection Board (RSSB)",       ...u("https://rsmssb.rajasthan.gov.in/", "https://rsmssb.rajasthan.gov.in/"),                scope: "state",   category: "state",    stateIds: ["rj"] },
  { id: "ssb-hr",        name: "Haryana Staff Selection Commission (HSSC)",    ...u("https://hssc.gov.in/", "https://hssc.gov.in/"),                                        scope: "state",   category: "state",    stateIds: ["hr"] },
  { id: "ssb-gj",        name: "Gujarat Subordinate Services Selection Board", ...u("https://gsssb.gujarat.gov.in/", "https://gsssb.gujarat.gov.in/"),                      scope: "state",   category: "state",    stateIds: ["gj"] },
  { id: "ssb-mp",        name: "MP Employees Selection Board (MPESB)",         ...u("https://esb.mp.gov.in/", "https://esb.mp.gov.in/"),                                    scope: "state",   category: "state",    stateIds: ["mp"] },

  /* ---------- STATE — Police recruitment boards ---------- */
  { id: "police-up",     name: "UP Police Recruitment Board (UPPRPB)",         ...u("https://uppbpb.gov.in/", "https://uppbpb.gov.in/"),                                    scope: "state",   category: "police",   stateIds: ["up"] },
  { id: "police-mh",     name: "Maharashtra Police Recruitment",               ...u("https://mahapolice.gov.in/recruitment", "https://mahapolice.gov.in/recruitment"),      scope: "state",   category: "police",   stateIds: ["mh"] },
  { id: "police-tn",     name: "Tamil Nadu Uniformed Services (TNUSRB)",       ...u("https://tnusrb.tn.gov.in/", "https://tnusrb.tn.gov.in/"),                              scope: "state",   category: "police",   stateIds: ["tn"] },
  { id: "police-rj",     name: "Rajasthan Police Recruitment",                 ...u("https://police.rajasthan.gov.in/recruitment", "https://police.rajasthan.gov.in/recruitment"), scope: "state", category: "police", stateIds: ["rj"] },
  { id: "police-mp",     name: "MP Police Headquarters — Recruitment",         ...u("https://mppolice.gov.in/", "https://mppolice.gov.in/"),                                scope: "state",   category: "police",   stateIds: ["mp"] },
  { id: "police-kl",     name: "Kerala Police Recruitment Board",              ...u("https://keralapolice.gov.in/", "https://keralapolice.gov.in/page/recruitment-board"), scope: "state",   category: "police",   stateIds: ["kl"] },
  { id: "police-ka",     name: "Karnataka State Police Recruitment",           ...u("https://ksp.karnataka.gov.in/", "https://ksp.karnataka.gov.in/"),                      scope: "state",   category: "police",   stateIds: ["ka"] },

  /* ---------- STATE — Other notable portals ---------- */
  { id: "delhi-portal",  name: "Delhi Govt — Job Notifications",               ...u("https://delhi.gov.in/", "https://delhi.gov.in/jobs"),                                  scope: "state",   category: "state",    stateIds: ["dl"] },
  { id: "py-rec",        name: "Puducherry Recruitment Portal",                ...u("https://recruitment.py.gov.in/", "https://recruitment.py.gov.in/"),                    scope: "state",   category: "state",    stateIds: ["py"] },
];

export function sitesForStateAndCategory(stateId, catId) {
  return OFFICIAL_SITES.filter(
    (s) =>
      (!catId || s.category === catId) &&
      (!stateId || s.stateIds.includes(stateId) || s.stateIds.includes("all"))
  );
}
