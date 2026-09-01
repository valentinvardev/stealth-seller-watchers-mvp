// Offline snapshot of the YouTube mentions radar: the 6 discovery queries, the
// 20 videos and 13 channels they surfaced, and the hand triage done on them.
// Pulled 2026-09-01T08:39:46Z; served as the fallback when YOUTUBE_API_KEY is
// missing or the search budget for the day is spent. Generated, do not hand edit.

export type SeedTriageStatus = "confirmed" | "review" | "dismissed";
export type TriageType = "review" | "tutorial" | "comparison" | "mention" | "complaint";

export type SeedVideo = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  publishedAt: string;
  durationSeconds: number;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  views: number;
  likes: number | null;
  comments: number | null;
  matchedQueries: string[];
};

export type SeedChannel = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscribers: number | null;
  videoCount: number | null;
};

export type SeedTriage = { status: SeedTriageStatus; type: TriageType | null; note: string };

export const SEED_QUERIES: string[] = [
  "\"stealth seller\" amazon",
  "\"stealth seller\" fba",
  "\"stealth seller\" arbitrage",
  "\"stealth seller\" review",
  "stealthseller",
  "stealthseller.co"
];

export const SEED_SNAPSHOT: { fetchedAt: string; videos: SeedVideo[]; channels: SeedChannel[] } = {
  "fetchedAt": "2026-09-01T08:39:46Z",
  "videos": [
    {
      "id": "NcprBxuWwYI",
      "title": "Aliens Confirm Stealth Seller s Sauce",
      "description": "\ud83d\udd25 Unlock Digital Wealth with StealthSeller\u2122\n\u26a1 No face.\n\u26a1 No limits.\n\u26a1 All power.\nWhether you\u2019re selling high-converting eBooks, flipping digital deals, or automating income streams \u2014 StealthSeller\u2122 is your key to freedom, speed, and silent success.\nhttps://payhip.com/TheStealthseller",
      "tags": [
        "https://payhip.com/TheStealthseller"
      ],
      "publishedAt": "2025-09-21T19:10:01Z",
      "durationSeconds": 9,
      "thumbnailUrl": "https://i.ytimg.com/vi/NcprBxuWwYI/mqdefault.jpg",
      "channelId": "UCsmu1NQttutXFtspN_dMKiQ",
      "channelTitle": "stealthseller",
      "views": 2,
      "likes": 0,
      "comments": 0,
      "matchedQueries": [
        "stealthseller"
      ]
    },
    {
      "id": "mOwbDgmfxh8",
      "title": "Storefront Stalking Made Easy | Amazon & Walmart Seller Hack",
      "description": "Try MSP Today - https://www.multisellerpro.com?a=yc4XBo5ZSEXZkraD\n\nStorefront Stalking for Amazon AND Walmart all in 1 place. Let MSP do the heavy lifting by pulling other sellers products and finding where you can buy them too to make a profitable flip. No more manually looking through everyone's listings. The old days of manual sourcing are gone. The old days of needing multiple softwares are go",
      "tags": [
        "make money online",
        "ecommerce",
        "amazon fba",
        "tips",
        "msp",
        "multisellerpro",
        "storefront stalking",
        "amazon sourcing",
        "walmart product sourcing",
        "reseller",
        "amazon reselling",
        "walmart seller account",
        "walmart seller",
        "product finder",
        "profitable products",
        "reseller tips",
        "product sourcing",
        "oa",
        "tutorial"
      ],
      "publishedAt": "2026-07-07T22:00:32Z",
      "durationSeconds": 1524,
      "thumbnailUrl": "https://i.ytimg.com/vi/mOwbDgmfxh8/mqdefault.jpg",
      "channelId": "UCQNtu1ZbyDuY0AB0YShmevw",
      "channelTitle": "Coach Maddie",
      "views": 135,
      "likes": 8,
      "comments": 0,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "Sy8PnpBtBYA",
      "title": "Kijan Pou Jwenn Products Ki F\u00e8 Lajan Rapid Av\u00e8k SellerAmp, Stealth Seller & WalSeller ",
      "description": "",
      "tags": [],
      "publishedAt": "2026-05-20T05:48:31Z",
      "durationSeconds": 147,
      "thumbnailUrl": "https://i.ytimg.com/vi/Sy8PnpBtBYA/mqdefault.jpg",
      "channelId": "UCVkKfjKmlRsnCzOzE7Ws-tA",
      "channelTitle": "Tukribish",
      "views": 154,
      "likes": 7,
      "comments": 1,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "stealthseller"
      ]
    },
    {
      "id": "eWIh8zaWOhY",
      "title": "Amazon Stealth Accounts Guide",
      "description": "How to create Amazon stealth accounts? And how to avoid Amazon seller account suspension? This Amazon stealth accounts guide will walk you through the most common risks of owning multiple profiles and how to overcome them. \n\nWe'll give you a step-by-step tutorial on how to make a profile and verify it. Then, we'll share some tips for running Amazon stealth accounts. You'll also learn about valuabl",
      "tags": [
        "proxies",
        "proxy",
        "amazon stealth accounts",
        "multiple seller accounts on amazon",
        "how to create amazon stealth accounts",
        "how to protect amazon account",
        "running amazon stealth accounts",
        "amazon stealth accounts guide",
        "backup amazon account",
        "proxies for amazon accounts",
        "how to not get suspended on amazon",
        "how to avoid amazon seller account suspension",
        "product visibility on amazon",
        "Owning multiple Amazon accounts",
        "Multilogin",
        "How does Amazon know if you have multiple accounts?",
        "amazon stealth"
      ],
      "publishedAt": "2022-12-23T08:40:04Z",
      "durationSeconds": 371,
      "thumbnailUrl": "https://i.ytimg.com/vi/eWIh8zaWOhY/mqdefault.jpg",
      "channelId": "UCjh6hWa9kIQmixh9sNpAr5g",
      "channelTitle": "Proxyway",
      "views": 2438,
      "likes": 37,
      "comments": 8,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "crx0HpiWYmc",
      "title": "A Day in the Life of a Full-Time Amazon FBA Seller",
      "description": "1 on 1 Experience \nhttps://calendly.com/boxedbycole/30min\n----\nStealth Seller\nhttps://stealthseller.co/?via=boxedbycole\n----\nTiktok\nBoxedByCole\n----\n\nMade the mistake of filming the wrong way. Now we know for the future and will be making another. LETS GOOOO",
      "tags": [],
      "publishedAt": "2026-06-17T22:43:49Z",
      "durationSeconds": 590,
      "thumbnailUrl": "https://i.ytimg.com/vi/crx0HpiWYmc/mqdefault.jpg",
      "channelId": "UCTnp_9EqsyqLDe80kGdLiZA",
      "channelTitle": "BoxedByCole",
      "views": 41,
      "likes": 4,
      "comments": 1,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" fba"
      ]
    },
    {
      "id": "zmGQ5lM0I94",
      "title": "Amazon Stealth \ud83d\udd25 How to Get Amazon Accounts for Dropshipping?",
      "description": "Amazon Stealth | Amazon Dropshipping | Selling on Amazon\n\u27a4 WhatsApp: https://prm.ink/Accify-WhatsApp\n\u27a4 Telegram: https://prm.ink/Accify-Telegram\n\n\ud83d\udd25 Aged Amazon Accounts\n\nAmazon-Accounts is a trusted online platform that specializes in providing aged Amazon accounts, offering individuals and businesses a reliable and established presence on the popular e-commerce platform. With a focus on quality ",
      "tags": [
        "amazon accounts for sale",
        "amazon fba",
        "how to sell on amazon",
        "selling on amazon",
        "amazon seller account",
        "amazon fba for beginners",
        "how to create amazon seller account",
        "amazon seller central",
        "amazon seller",
        "amazon fba tutorial",
        "create amazon seller account",
        "amazon",
        "amazon fba step by step",
        "amazon store suspended",
        "buy amazon seller account",
        "amazon account suspended",
        "how to set up amazon seller account",
        "how to create an amazon seller account",
        "amazon dropshipping",
        "Amazon Stealth"
      ],
      "publishedAt": "2023-07-10T03:49:00Z",
      "durationSeconds": 133,
      "thumbnailUrl": "https://i.ytimg.com/vi/zmGQ5lM0I94/mqdefault.jpg",
      "channelId": "UCVnv7RSnKCyUl3yQCpwkUWw",
      "channelTitle": "NinjaPanel SMM Services",
      "views": 1187,
      "likes": 5,
      "comments": 1,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "5ujP9zrYiV4",
      "title": "Amazon FBA Ghost Accounts | Easy Setup for Suspensions | Amazon Stealth Accounts",
      "description": "Going over how to setup ghost accounts for Amazon FBA. Having backups for your  amazon account if your account is suspended. you can create a Stealth Amazon FBA Account.  I hope to answer some of the fears with Amazon FBA and account suspensions\n\nI hope to be the black Mr. Beast of the community.  \n\nThank you so much for watching the video and even reading this. People don\u2019t read these things. I w",
      "tags": [
        "amazon seller account",
        "amazon ghost account",
        "set up Amazon ghost accounts",
        "amazon fba backup sellers account",
        "retail arbitrage amazon fba",
        "creating another Amazon Fba account",
        "amazon suspended account",
        "amazon suspended account plan of action",
        "amazon fba 2020",
        "ebay seller",
        "Prison 2 profit",
        "prison to profit",
        "prison2profit",
        "blackmrbeast",
        "ebay reseller",
        "amazon account suspension",
        "Amazon Stealth Account Setup",
        "Amazon FBA Stealth",
        "creating a stealth account for amazon",
        "bsrllc",
        "ebay fba"
      ],
      "publishedAt": "2020-10-06T23:45:10Z",
      "durationSeconds": 929,
      "thumbnailUrl": "https://i.ytimg.com/vi/5ujP9zrYiV4/mqdefault.jpg",
      "channelId": "UCoUSsFdajQNBXM6iH291tzg",
      "channelTitle": "Dontae Morgan",
      "views": 4500,
      "likes": 138,
      "comments": 119,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "n0P57LhorT4",
      "title": "How I Sold $4.5M using Stealth Seller for Amazon FBA",
      "description": "Try Stealth Seller 14 days Free: https://stealthseller.co/#pricing?utm_source=youtube&utm_medium=video&utm_campaign=stealth_april1\n\nWork 1-on-1 with me to sell on Amazon: https://go.sellercentralboys.com/1030b65e\n\n\nIt's Hamza from the seller central boys. In this video I break down for you how Stealth Seller, our proprietary software, helped me sell over $4.5M (and counting) through Amazon FBA onl",
      "tags": [
        "amazon fba",
        "arbitrage",
        "amazon fba online arbitrage",
        "stealth seller tutorial",
        "how to use stealth seller",
        "How to find amazon fba products",
        "how to reverse source amazon fba",
        "Amazon FBA for beginners",
        "Amazon FBA explained",
        "Store front stalking"
      ],
      "publishedAt": "2025-04-02T18:14:15Z",
      "durationSeconds": 802,
      "thumbnailUrl": "https://i.ytimg.com/vi/n0P57LhorT4/mqdefault.jpg",
      "channelId": "UCyOoPj0Bbwc1Uy6CZHmVcew",
      "channelTitle": "Seller Central Boys",
      "views": 2321,
      "likes": 101,
      "comments": 13,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" fba",
        "\"stealth seller\" arbitrage",
        "\"stealth seller\" review",
        "stealthseller",
        "stealthseller.co"
      ]
    },
    {
      "id": "T9qgD295YXs",
      "title": "STEALTH SELLER ACCOUNT | AMAZON FBA RESELLER",
      "description": "Join my mentorship program  https://learn.reezyresells.com/the-reselling-academy\n\nJoin my Discord https://bit.ly/divineXreezy\nSchedule a 1 on 1 consultation https://reezyresells.com/consulting\nSellerAmp Scanning app https://www.selleramp.com/reezy\n30 day free trial of Go2Lister https://Go2Lister.com/reezy\n45 Day Free Trial of Aura Repricer https://try.goaura.com/reezy-es (use promo code 'Reezy' to",
      "tags": [
        "amazon fba",
        "reselling",
        "amazon seller",
        "selling on amazon",
        "2 amazon accounts",
        "2 amazon seller account",
        "how to get back amazon account",
        "suspended amazon",
        "how to get your amazon account off hold",
        "how to get your amazon",
        "suspended on amazon",
        "amazon suspension",
        "stealth amazon account",
        "ghost amazon account",
        "burner amazon account",
        "how to sell on amazon",
        "reezyresells",
        "reezy resells",
        "reezy garyvee",
        "selling on amazon for beginners",
        "selling on amazon fba",
        "retail arbitrage"
      ],
      "publishedAt": "2021-05-07T20:22:00Z",
      "durationSeconds": 271,
      "thumbnailUrl": "https://i.ytimg.com/vi/T9qgD295YXs/mqdefault.jpg",
      "channelId": "UCeq8GxD-kFVV5S1i0MCmzTg",
      "channelTitle": "Reezy Resells",
      "views": 17338,
      "likes": 443,
      "comments": 65,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" fba"
      ]
    },
    {
      "id": "TDufPcv9CzQ",
      "title": "The Amazon Scaling Blueprint (0 to 6 Figures)",
      "description": "1on1 Mentorship\nhttps://calendly.com/boxedbycole/30min\n----\nSellerBoard/Track Profit\nhttps://sellerboard.com/?p=02437\n-----\nFREE COMMUNITY\nhttps://discord.gg/RBK7DjH78\n-----\nStealth Seller\nhttps://stealthseller.co/?via=boxedbycole\n------",
      "tags": [],
      "publishedAt": "2026-07-30T20:59:44Z",
      "durationSeconds": 781,
      "thumbnailUrl": "https://i.ytimg.com/vi/TDufPcv9CzQ/mqdefault.jpg",
      "channelId": "UCTnp_9EqsyqLDe80kGdLiZA",
      "channelTitle": "BoxedByCole",
      "views": 31,
      "likes": 1,
      "comments": 0,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "4VWELG9Oheo",
      "title": "What is Stealth Seller ? The best storefront stalking software For Amazon FBA",
      "description": "https://stealthseller.co/eccoflips",
      "tags": [],
      "publishedAt": "2022-11-23T20:20:06Z",
      "durationSeconds": 886,
      "thumbnailUrl": "https://i.ytimg.com/vi/4VWELG9Oheo/mqdefault.jpg",
      "channelId": "UC8uLROQ8wAXVqPxMhLqqcXA",
      "channelTitle": "Cody Flips",
      "views": 1466,
      "likes": 35,
      "comments": 13,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" fba",
        "\"stealth seller\" arbitrage",
        "\"stealth seller\" review",
        "stealthseller",
        "stealthseller.co"
      ]
    },
    {
      "id": "RHxRIEPtm1k",
      "title": "Stealth seller 8",
      "description": "\u26a1 No face.\n\u26a1 No limits.\n\u26a1 All power.\nWhether you\u2019re selling high-converting eBooks, flipping digital deals, or automating income streams \u2014 StealthSeller\u2122 is your key to freedom, speed, and silent success.",
      "tags": [],
      "publishedAt": "2025-09-21T19:17:19Z",
      "durationSeconds": 32,
      "thumbnailUrl": "https://i.ytimg.com/vi/RHxRIEPtm1k/mqdefault.jpg",
      "channelId": "UCsmu1NQttutXFtspN_dMKiQ",
      "channelTitle": "stealthseller",
      "views": 8,
      "likes": 0,
      "comments": 0,
      "matchedQueries": [
        "stealthseller"
      ]
    },
    {
      "id": "0CwmZ5c01HE",
      "title": "Amazon Stealth Accounts: How Suspended Sellers Get Back Online",
      "description": "Are stealth accounts the hidden strategy fueling success for certain Amazon sellers?\n\ud83d\udd25 Let EHP Consulting Group Help You Here \u27a1\ufe0f http://ehpconsultinggroup.com/ \n\nAmazon's strict monitoring systems and linkage protocols often prevent suspended sellers from simply creating a new account. This need has driven some sellers into the complex, high-risk world of \"stealth accounts,\" which are designed to",
      "tags": [
        "amazon stealth accounts",
        "amazon suspension",
        "suspended amazon seller",
        "how to sell on amazon after suspension",
        "amazon multiple accounts",
        "amazon policy violation",
        "amazon account association",
        "selling on amazon after ban",
        "amazon fba",
        "ecommerce policy",
        "account reinstatement",
        "amazon terms of service"
      ],
      "publishedAt": "2026-03-21T15:45:01Z",
      "durationSeconds": 400,
      "thumbnailUrl": "https://i.ytimg.com/vi/0CwmZ5c01HE/mqdefault.jpg",
      "channelId": "UChnKnNXRdna7TNsrd8g3Wmw",
      "channelTitle": "EHP Consulting Group - Amazon Expert",
      "views": 89,
      "likes": 0,
      "comments": 4,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "J6rnOElaCXM",
      "title": "How To Start Amazon FBA Online Arbitrage In 2026 (FULL FREE COURSE)",
      "description": "How To Start Amazon FBA Online Arbitrage for beginners In 2025\n\nWork with me 1-on-1: https://go.sellercentralboys.com/f9262f98\n\nTopics discussed: \n\nonline arbitrage amazon,what is online arbitrage amazon,online arbitrage sourcing,amazon arbitrage step by step,online arbitrage fba,online arbitrage for beginners,online arbitrage,amazon product sourcing,how to sell on amazon for beginners,amazon prod",
      "tags": [
        "online arbitrage amazon",
        "what is online arbitrage amazon",
        "online arbitrage sourcing",
        "amazon arbitrage step by step",
        "online arbitrage fba",
        "online arbitrage for beginners",
        "online arbitrage",
        "amazon product sourcing",
        "how to sell on amazon for beginners",
        "amazon product sourcing tutorial",
        "how to sell on amazon fba for beginners",
        "how to sell on amazon fba",
        "amazon product research",
        "how to sell on amazon",
        "what to sell on amazon",
        "amazon fba for beginners",
        "arbitrage",
        "seller central boys"
      ],
      "publishedAt": "2025-04-16T15:14:56Z",
      "durationSeconds": 6408,
      "thumbnailUrl": "https://i.ytimg.com/vi/J6rnOElaCXM/mqdefault.jpg",
      "channelId": "UCyOoPj0Bbwc1Uy6CZHmVcew",
      "channelTitle": "Seller Central Boys",
      "views": 8264,
      "likes": 265,
      "comments": 28,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "LTnyNXQVu6o",
      "title": "How to Create Amazon Stealth accounts?",
      "description": "How to create and maintain multiple Amazon seller accounts? Short answer - take care of your browser fingerprint and IP. To get more valuable tips, watch our full Amazon Stealth Accounts Guide.",
      "tags": [
        "amazon stealth accounts",
        "amazon stealth",
        "how to sell on amazon",
        "selling on amazon",
        "selling on amazon for beginners",
        "amazon seller account",
        "how to sell on amazon step by step",
        "amazon seller account create",
        "amazon proxies",
        "how amazon identifies you",
        "browser fingerprinting",
        "how to avoid amazon account suspension",
        "amazon seller stealth account"
      ],
      "publishedAt": "2023-07-24T10:12:21Z",
      "durationSeconds": 39,
      "thumbnailUrl": "https://i.ytimg.com/vi/LTnyNXQVu6o/mqdefault.jpg",
      "channelId": "UCjh6hWa9kIQmixh9sNpAr5g",
      "channelTitle": "Proxyway",
      "views": 2037,
      "likes": 25,
      "comments": 2,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "_SpYD5piZL0",
      "title": "How to Use Stealth Seller to Automate Amazon FBA Online Arbitrage Sourcing (2026)",
      "description": "How to use Stealth Seller to automate your Amazon FBA product sourcing. In this online arbitrage walkthrough I show you how the software finds profitable products, checks the numbers, and hands you a buy list, so you stop sourcing one product at a time.\n\nTimestamps:\n0:00 - Intro\n1:49 - Real profit example (what's possible)\n4:05 - How everyone sources products manually\n4:38 - Why storefront stalkin",
      "tags": [
        "amazon fba",
        "amazon fba 2026",
        "stealth seller tutorial",
        "stealth amazon account",
        "how to create stealth amazon account",
        "amazon fba for beginners",
        "stealth seller central",
        "amazon seller account setup",
        "stealth account tutorial",
        "amazon fba step by step",
        "stealth amazon fba 2026",
        "new amazon seller account",
        "amazon fba blueprint",
        "stealth seller blueprint",
        "amazon wholesale for beginners",
        "how to sell on amazon 2026"
      ],
      "publishedAt": "2026-01-27T18:29:51Z",
      "durationSeconds": 2214,
      "thumbnailUrl": "https://i.ytimg.com/vi/_SpYD5piZL0/mqdefault.jpg",
      "channelId": "UCyOoPj0Bbwc1Uy6CZHmVcew",
      "channelTitle": "Seller Central Boys",
      "views": 1686,
      "likes": 61,
      "comments": 10,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" fba",
        "\"stealth seller\" arbitrage",
        "\"stealth seller\" review",
        "stealthseller",
        "stealthseller.co"
      ]
    },
    {
      "id": "trjAhJs-yso",
      "title": "Amazon s Insane Move Revealed  How It Affects Sellers and Stealth Accounts",
      "description": "Please subscribe, like & share my videos\u2026 Oh\u2026 and use my links below\u2026\n\nCheck out my Website!\nwww.PoochiesPack.com\n\nSo how does this possibly affect you or the Amazon selling community? Stealth accounts. This is going to shut down a lot of stealth accounts, I predict. To ensure a trusted store for both consumers and sellers, Amazon already maintains and continues to innovate our robust processes fo",
      "tags": [
        "ebay",
        "ebay dropshipping",
        "amazon",
        "amazon dropshipping",
        "selling on ebay",
        "selling on amazon",
        "amazon fba",
        "ecommerce",
        "make money online",
        "how to sell online",
        "how to make money online",
        "make money",
        "start a business"
      ],
      "publishedAt": "2023-05-25T22:00:24Z",
      "durationSeconds": 27,
      "thumbnailUrl": "https://i.ytimg.com/vi/trjAhJs-yso/mqdefault.jpg",
      "channelId": "UCAVwT0zbARr-p6mz3W8h4SQ",
      "channelTitle": "Poochie's Pack",
      "views": 500,
      "likes": null,
      "comments": 2,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "a0VCZJfN8lk",
      "title": "DO NOT Do This With Your Amazon Stealth or Ghost Account or You\u2019ll NEVER Get It Back!",
      "description": "",
      "tags": [],
      "publishedAt": "2022-12-01T20:58:29Z",
      "durationSeconds": 56,
      "thumbnailUrl": "https://i.ytimg.com/vi/a0VCZJfN8lk/mqdefault.jpg",
      "channelId": "UCAVwT0zbARr-p6mz3W8h4SQ",
      "channelTitle": "Poochie's Pack",
      "views": 386,
      "likes": null,
      "comments": 0,
      "matchedQueries": [
        "\"stealth seller\" amazon"
      ]
    },
    {
      "id": "umBVL9smOnY",
      "title": "Kijan pou w Itilize Stealth Seller Pou w ka Jwenn Prodwi pou w ka revann sou Amazon",
      "description": "Kijan pou w Itilize Stealth Seller Pou w ka Jwenn Prodwi pou w ka revann sou Amazon \n\n\nByenvini sou chanel mwen an m swete ke ou pase yon bon jounen jodi a . mesi paske w parn tan w pou w gade video mwen yo sa vreman ede m pou m avanse pou pi devan e map travay pi di pou ,m toujou pote video pou nou pou nou ka detann nou pandan moman stres nou yo\r\nnou konnen ke peyi ke nou fet la Haiti pa vreman o",
      "tags": [
        "#Haitiancreator",
        "#Billy-VlogH4N"
      ],
      "publishedAt": "2026-08-31T02:43:28Z",
      "durationSeconds": 772,
      "thumbnailUrl": "https://i.ytimg.com/vi/umBVL9smOnY/mqdefault.jpg",
      "channelId": "UCVkKfjKmlRsnCzOzE7Ws-tA",
      "channelTitle": "Tukribish",
      "views": 86,
      "likes": 2,
      "comments": 1,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "stealthseller"
      ]
    },
    {
      "id": "1FGyUJTnBD0",
      "title": "One of the Fastest Way to Find Profitable Online Arbitrage Products for Amazon FBA .. Stealth Seller",
      "description": "Get Stealth Seller: https://stealthseller.co/sidehustleexperiment\n\nSpy on your favorite resellers. Stealth Seller automates storefront stalking for you. No more manual storefront stalking.\n\n\r\nGet a FREE copy of The OA Tracking Spreadsheet: https://youtu.be/_oYOaxUvE2k \n(This is the sheet I use this to track all my purchases) \n\nBook a Coaching Call: https://sidehustleexperiment.com/book-a-coaching-",
      "tags": [
        "online arbitrage guide for beginners",
        "online arbitrage",
        "online arbitrage 2022",
        "online arbitrage amazon",
        "online arbitrage for amazon fba",
        "online arbitrage for beginners",
        "online arbitrage for fba",
        "online arbitrage product research",
        "online arbitrage software",
        "online arbitrage sourcing",
        "online arbitrage sourcing lists",
        "amazon fba online arbitrage",
        "how to find products for online arbitrage",
        "how to online arbitrage",
        "amazon fba",
        "john muscarello",
        "side hustle experiment",
        "Stealth Seller"
      ],
      "publishedAt": "2022-11-29T08:25:07Z",
      "durationSeconds": 1409,
      "thumbnailUrl": "https://i.ytimg.com/vi/1FGyUJTnBD0/mqdefault.jpg",
      "channelId": "UC6n_zKxpkPFg5H3aaS7wrwQ",
      "channelTitle": "John Muscarello",
      "views": 508,
      "likes": 24,
      "comments": 5,
      "matchedQueries": [
        "\"stealth seller\" amazon",
        "\"stealth seller\" arbitrage"
      ]
    }
  ],
  "channels": [
    {
      "id": "UCVnv7RSnKCyUl3yQCpwkUWw",
      "title": "NinjaPanel SMM Services",
      "thumbnailUrl": "https://yt3.ggpht.com/ytc/AIdro_lz2YVXueUmcUg-vlTq791mJIRmRtclmJ_LIkR5WdT18g=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 1020,
      "videoCount": 14
    },
    {
      "id": "UCsmu1NQttutXFtspN_dMKiQ",
      "title": "stealthseller",
      "thumbnailUrl": "https://yt3.ggpht.com/ytc/AIdro_mxfUHocZC3k1GTU-tB9c-SwHBtJxXwIcwgL4blbVKsXyQs2EjHY8ZU_UQkefNqv-jFPQ=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 0,
      "videoCount": 2
    },
    {
      "id": "UCyOoPj0Bbwc1Uy6CZHmVcew",
      "title": "Seller Central Boys",
      "thumbnailUrl": "https://yt3.ggpht.com/r_ur8BSfW6PRRVSdKCJrCPYo1XOJAg3wg9Sk76JZjgS9TW7jfgaK_PPA1DwgAhKUMEQCExZy1Q=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 1140,
      "videoCount": 11
    },
    {
      "id": "UChnKnNXRdna7TNsrd8g3Wmw",
      "title": "EHP Consulting Group - Amazon Expert",
      "thumbnailUrl": "https://yt3.ggpht.com/Lt6X1Br6iIUu1eNGUiCLDUvnuC5Fba9u64gLx3Nw0fdnb_fuEkC8VyVixuHzDFGzQzzUUwHN=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 6760,
      "videoCount": 2671
    },
    {
      "id": "UCjh6hWa9kIQmixh9sNpAr5g",
      "title": "Proxyway",
      "thumbnailUrl": "https://yt3.ggpht.com/ytc/AIdro_kb0lzgCd8GHw3xWLtdyD8vdKe6H15S9qDMlNW4SCOkQw=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 8040,
      "videoCount": 133
    },
    {
      "id": "UCAVwT0zbARr-p6mz3W8h4SQ",
      "title": "Poochie's Pack",
      "thumbnailUrl": "https://yt3.ggpht.com/tdzsqR__TT2NKQzq2aAEEq6EpH6a61TxYamutUjCGpH1iuzTsm_lj-TRnxVACF0yUuF21tTfflI=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 33100,
      "videoCount": 861
    },
    {
      "id": "UC8uLROQ8wAXVqPxMhLqqcXA",
      "title": "Cody Flips",
      "thumbnailUrl": "https://yt3.ggpht.com/KAxtNc3MkDlntHTFGq2Rtq1D54ddlkRiqt3An-x9nRmtKPTfNi35gZix6T2vSWsp_8PfSvs3NPE=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 2310,
      "videoCount": 483
    },
    {
      "id": "UC6n_zKxpkPFg5H3aaS7wrwQ",
      "title": "John Muscarello",
      "thumbnailUrl": "https://yt3.ggpht.com/0kP5taUkb6cwM1tDBtjVdUvJIQ25xREfRB1AI-Tvu3IxC3cLH4NmJjyjhaqnZxDUh2jxtu_5=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 4790,
      "videoCount": 941
    },
    {
      "id": "UCoUSsFdajQNBXM6iH291tzg",
      "title": "Dontae Morgan",
      "thumbnailUrl": "https://yt3.ggpht.com/bbST8Mrbo5T85nGeM9adTTsgLOwGz97jsousQ_JU08wyBdQeMiTL46j5yd120Bbk15oIHnUfb6A=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 22700,
      "videoCount": 942
    },
    {
      "id": "UCeq8GxD-kFVV5S1i0MCmzTg",
      "title": "Reezy Resells",
      "thumbnailUrl": "https://yt3.ggpht.com/acQKl8p3WaWMhwKWSMBvH8OjKNHP_NOIrocKkjhoFKhK99WrgsXJ223EZw7yvndxXx6wDV645Q=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 492000,
      "videoCount": 991
    },
    {
      "id": "UCTnp_9EqsyqLDe80kGdLiZA",
      "title": "BoxedByCole",
      "thumbnailUrl": "https://yt3.ggpht.com/LXXyJLl9ILVDcDVeqGSMuLhnYOt52XQKzrN3N5M5WuhkXK4OisJ_xFGuzuPk9bC6cAYTc6yjvQ=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 27,
      "videoCount": 38
    },
    {
      "id": "UCQNtu1ZbyDuY0AB0YShmevw",
      "title": "Coach Maddie",
      "thumbnailUrl": "https://yt3.ggpht.com/Kv6jvwHPVTCSFQJjMTFP7TzTHzqlg6l3_fpq3nxgGX20MxDA5UaxfW9vkvSeNbVnuqgs2AG4Bw=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 46,
      "videoCount": 9
    },
    {
      "id": "UCVkKfjKmlRsnCzOzE7Ws-tA",
      "title": "Tukribish",
      "thumbnailUrl": "https://yt3.ggpht.com/afyfYdCJOESdUORxvnuotNxSuWxzEt2-TZUu1_2OchU5-kdx4_KulxdBiyLjM6Ua6XloLYnssyQ=s240-c-k-c0x00ffffff-no-rj",
      "subscribers": 6900,
      "videoCount": 86
    }
  ]
};

export const SEED_TRIAGE: Record<string, SeedTriage> = {
  "_SpYD5piZL0": {
    "status": "confirmed",
    "type": "tutorial",
    "note": "Seller Central Boys, brand in title, description, tags and link. Also the video CX uses for onboarding."
  },
  "n0P57LhorT4": {
    "status": "confirmed",
    "type": "review",
    "note": "Seller Central Boys, How I Sold 4.5M using Stealth Seller. Brand everywhere."
  },
  "4VWELG9Oheo": {
    "status": "confirmed",
    "type": "review",
    "note": "Cody Flips, calls it the best storefront stalking software. Testimonial."
  },
  "1FGyUJTnBD0": {
    "status": "confirmed",
    "type": "tutorial",
    "note": "John Muscarello, brand in title, description, tags and link."
  },
  "umBVL9smOnY": {
    "status": "confirmed",
    "type": "tutorial",
    "note": "Tukribish, Haitian Creole tutorial on using Stealth Seller."
  },
  "Sy8PnpBtBYA": {
    "status": "confirmed",
    "type": "comparison",
    "note": "Tukribish, SellerAmp vs Stealth Seller vs WalSeller."
  },
  "TDufPcv9CzQ": {
    "status": "confirmed",
    "type": "mention",
    "note": "BoxedByCole, brand only in description with a stealthseller.co link. Affiliate style mention."
  },
  "crx0HpiWYmc": {
    "status": "confirmed",
    "type": "mention",
    "note": "BoxedByCole, same pattern, description plus link."
  },
  "J6rnOElaCXM": {
    "status": "review",
    "type": null,
    "note": "Seller Central Boys full free course, 8264 views. Brand not in title, description or tags, yet returned by search. Likely covered inside the video."
  },
  "mOwbDgmfxh8": {
    "status": "review",
    "type": null,
    "note": "Coach Maddie, Storefront Stalking Made Easy. Same pattern, brand absent from metadata but returned by search."
  },
  "T9qgD295YXs": {
    "status": "dismissed",
    "type": null,
    "note": "Reezy Resells 2021, stealth account content, not the product."
  },
  "0CwmZ5c01HE": {
    "status": "dismissed",
    "type": null,
    "note": "EHP Consulting, stealth accounts for suspended sellers."
  },
  "LTnyNXQVu6o": {
    "status": "dismissed",
    "type": null,
    "note": "Proxyway, stealth accounts."
  },
  "eWIh8zaWOhY": {
    "status": "dismissed",
    "type": null,
    "note": "Proxyway, stealth accounts."
  },
  "zmGQ5lM0I94": {
    "status": "dismissed",
    "type": null,
    "note": "NinjaPanel, stealth accounts."
  },
  "trjAhJs-yso": {
    "status": "dismissed",
    "type": null,
    "note": "Poochie's Pack, stealth accounts."
  },
  "a0VCZJfN8lk": {
    "status": "dismissed",
    "type": null,
    "note": "Poochie's Pack, stealth accounts."
  },
  "5ujP9zrYiV4": {
    "status": "dismissed",
    "type": null,
    "note": "Dontae Morgan, ghost accounts."
  },
  "RHxRIEPtm1k": {
    "status": "dismissed",
    "type": null,
    "note": "Junk channel named stealthseller, 0 subs, 32 second short."
  },
  "NcprBxuWwYI": {
    "status": "dismissed",
    "type": null,
    "note": "Same junk channel, 9 second short."
  }
};

export const SEED_SUPPRESSED_CHANNELS: Record<string, { title: string; note: string }> = {
  "UChnKnNXRdna7TNsrd8g3Wmw": {
    "title": "EHP Consulting Group - Amazon Expert",
    "note": "stealth accounts cluster"
  },
  "UCjh6hWa9kIQmixh9sNpAr5g": {
    "title": "Proxyway",
    "note": "stealth accounts cluster"
  },
  "UCVnv7RSnKCyUl3yQCpwkUWw": {
    "title": "NinjaPanel SMM Services",
    "note": "stealth accounts cluster"
  },
  "UCAVwT0zbARr-p6mz3W8h4SQ": {
    "title": "Poochie's Pack",
    "note": "stealth accounts cluster"
  },
  "UCoUSsFdajQNBXM6iH291tzg": {
    "title": "Dontae Morgan",
    "note": "ghost accounts"
  },
  "UCeq8GxD-kFVV5S1i0MCmzTg": {
    "title": "Reezy Resells",
    "note": "492k subs but the match is stealth account content, not the product"
  },
  "UCsmu1NQttutXFtspN_dMKiQ": {
    "title": "stealthseller",
    "note": "junk channel squatting the name, 0 subs"
  }
};
