import { getAmenitiesForLocation } from "@/data/locationAmenities";

const MENU_STORAGE_BASE =
  'https://storage.googleapis.com/thebunker-website.appspot.com/menus';

const menuUrl = (filename: string) => `${MENU_STORAGE_BASE}/${filename}`;

type LocationRecord = Record<string, any>;

const TB_G_MENU = menuUrl('Bunker_G_Menu_20230911.pdf');
const TB_KIDS_MENU = menuUrl('Bunker_Kids_Menu.pdf');
const TB_CP_MENU = menuUrl('Bunker_Menu_NG_CP_20240904.pdf');
const TB_NG_MENU = menuUrl('Bunker_Menu_NG_CP_20240904.pdf');
const TB_NH_MENU = menuUrl('Bunker_Menu_NH_6_6_25.pdf');
const TB_MH_MENU = menuUrl('Bunker_MH_Menu_20250308.pdf');
const TB_CP_SPECIALTY_DRINKS_MENU = menuUrl(
  'Bunker_Spring_Summer_all_locations_Specialty_Drink_Menu_3_4_25.pdf',
);
const TB_MH_SPECIALTY_DRINKS_MENU = menuUrl(
  'Bunker_Spring_Summer_all_locations_Specialty_Drink_Menu_3_4_25.pdf',
);
const TB_NG_SPECIALTY_DRINKS_MENU = menuUrl(
  'Bunker_Spring_Summer_all_locations_Specialty_Drink_Menu_3_4_25.pdf',
);
const TB_NH_SPECIALTY_DRINKS_MENU = menuUrl(
  'Bunker_Spring_Summer_all_locations_Specialty_Drink_Menu_3_4_25.pdf',
);
const TB_BASE_DESSERT_MENU = menuUrl(
  'Bunker_Base_Menu_Dessert_8_22_24.pdf',
);

const cliftonpark_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/main.png';
const cliftonpark_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/one.png';
const cliftonpark_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/two.png';
const cliftonpark_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/three.png';
const cliftonpark_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/clifton-park/four.png';

const guilderland_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/guilderland/main.png';
const guilderland_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/guilderland/one.png';
const guilderland_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/guilderland/two.png';
const guilderland_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/guilderland/three.png';
const guilderland_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/guilderland/four.png';

const latham_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/main.jpg';
const latham_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/mezzanine.jpg';
const latham_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/frontnine.jpg';
const latham_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/barroom.jpg';
const latham_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/latham-new/backroom.jpg';

const northgreenbush_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/north-greenbush/one.png';
const northgreenbush_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/north-greenbush/two.png';
const northgreenbush_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/north-greenbush/three.png';
const northgreenbush_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/north-greenbush/four.png';
const northgreenbush_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/north-greenbush/main.png';

const newhartford_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/new-hartford/one.png';
const newhartford_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/new-hartford/two.png';
const newhartford_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/new-hartford/three.png';
const newhartford_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/new-hartford/four.png';
const newhartford_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/new-hartford/main.png';

const mohawkharbor_1 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/mohawkharbor/one.png';
const mohawkharbor_2 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/mohawkharbor/two.png';
const mohawkharbor_3 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/mohawkharbor/three.png';
const mohawkharbor_4 =
  'https://storage.googleapis.com/thebunker-assets/thebunker/mohawkharbor/four.png';
const mohawkharbor_main =
  'https://storage.googleapis.com/thebunker-assets/thebunker/mohawkharbor/main.png';

const VIRTUAL_TOUR_URLS: Record<string, string> = {
  cliftonpark: 'https://mpembed.com/show/?m=u9BpmnnH69C&mpu=1854',
  guilderland: 'https://mpembed.com/show/?m=fma1tdkHirm&mpu=1854',
  latham: 'https://mpembed.com/show/?m=uzLoCgELmYD&mpu=1854',
  northgreenbush: 'https://mpembed.com/show/?m=EycycPF8DQT&mpu=1854',
  newhartford: 'https://mpembed.com/show/?m=A8QBTuwjiYY&mpu=1854',
  mohawkharbor: 'https://mpembed.com/show/?m=WV5KC6JHdfV&mpu=1854',
  saratoga: 'https://mpembed.com/show/?m=AyNVXroMWhK&mpu=1854',
};

const locations: LocationRecord[] = [
  /*
   *    Clifton Park 0
   */
  {
    images: [
      cliftonpark_main,
      cliftonpark_1,
      cliftonpark_2,
      cliftonpark_3,
      cliftonpark_4,
    ],
    id: 'cliftonpark',
		careerEmails: ['careers@getinthebunker.golf', 'cliftonparkmanager@getinthebunker.golf'],
    menus: [
      // { pdf: TB_CP_BRUNCH_MENU, name: 'Brunch Menu' },
      { pdf: TB_CP_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      {
        pdf: TB_KIDS_MENU,
        name: 'Kids Menu',
      },
      { pdf: TB_CP_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],
    url: 'https://thebunker-teefindr-live.web.app/location/thebunker/thebunkercliftonpark-yjGcFjTiX8v9MBbsq7HC',
    email: 'info@GetInTheBunker.golf',
    name: 'Clifton Park',
    address: '19 Clifton Country Rd, Clifton Park, NY 12065',
    phone: '(518) 280-6347',
    newItems: true,
    hoursFull: "Tues-Fri 4pm-11pm, Sat 10am-11pm, Sun Closed",
    nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$60 per hour' },
        { name: 'Bay 2', price: '$60 per hour' },
        { name: 'Bay 3', price: '$50 per hour' },
        { name: 'Bay 4', price: '$50 per hour' },
        { name: 'Bay 5', price: '$50 per hour' },
        { name: 'VIP Suite (Private)', price: '$100 per hour' },
        {
          name: 'Darts',
          price: '$15/guest/hour with a maximum of $60/hour',
        },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$70 per hour' },
        { name: 'Bay 2', price: '$70 per hour' },
        { name: 'Bay 3', price: '$60 per hour' },
        { name: 'Bay 4', price: '$60 per hour' },
        { name: 'Bay 5', price: '$60 per hour' },
        { name: 'VIP Suite (Private)', price: '$100 per hour' },
        {
          name: 'Darts',
          price: '$15/guest/hour with a maximum of $60/hour',
        },
      ],
    },
    mealeo: 'https://order.getinthebunker.menu/r/67282',
		ubereats: 'https://www.ubereats.com/store/the-bunker-clifton-park/TVUjJ6XmUPS0H9tsWT3Hmg?diningMode=DELIVERY',
		doordash: 'https://www.doordash.com/store/the-bunker-clifton-park-34208261/67300546/',
    coordinates: { lat: 42.85883117180785, lng: -73.78237199029 },
    promotions: [
      {
        title: 'VIP Suite Discount',
        body: 'VIP Suite $70 Monday-Thursday with 4 players or less',
      },
    ],
    amenities: getAmenitiesForLocation("cliftonpark"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.cliftonpark,
  },

  /*
   *    Guilderland 1
   */
  {
    images: [
      guilderland_main,
      guilderland_1,
      guilderland_2,
      guilderland_3,
      guilderland_4,
    ],
    id: 'guilderland',
	careerEmails: ['careers@getinthebunker.golf', 'heather@getinthebunker.golf'],
    menus: [{ pdf: TB_G_MENU, name: 'Main Menu' }],
    url: 'https://thebunker-teefindr-live.web.app/location/thebunker/thebunkerguilderland-ImZXmsKGBwwQXrJubMkl',
    email: 'info@GetInTheBunker.golf',
    name: 'Guilderland',
    address: '2390 Western Ave, Guilderland, NY 12084',
    phone: '(518) 867-3008',
		hoursFull: 'Mon-Fri 10am-4pm',
    nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$50 per hour' },
        { name: 'Bay 10', price: '$50 per hour' },
        { name: 'Bay 18', price: '$50 per hour' },
        { name: 'VIP Suite (Private)', price: '$70 per hour' },
        { name: 'Dutchmen Room (Private)', price: '$70 per hour' },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$60 per hour' },
        { name: 'Bay 10', price: '$60 per hour' },
        { name: 'Bay 18', price: '$60 per hour' },
        { name: 'VIP Suite (Private)', price: '$70 per hour' },
        { name: 'Dutchmen Room (Private)', price: '$70 per hour' },
      ],
    },
    coordinates: { lat: 42.70660985151098, lng: -73.91846325308022 },
    promotions: [],
    amenities: getAmenitiesForLocation("guilderland"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.guilderland,
  },

  /*
   *   Latham 2
   */
  {
    id: 'latham',
		careerEmails: ['careers@getinthebunker.golf', 'taylor@getinthebunker.golf'],
    images: [latham_main, latham_1, latham_2, latham_4, latham_3],
    url: 'https://thebunker-teefindr-live.web.app/location/thebunker/thebunkerlatham-rXoUF84Muscxpvvq7VlO',
    name: 'Latham',
    email: 'info@GetInTheBunker.golf',
		doordash: 'https://order.online/store/the-bunker-latham-34072735/?delivery=true&hideModal=true',
		ubereats: 'https://www.ubereats.com/store/the-bunker-latham/Pg3vbfA7To6YZovvUwLIeA?diningMode=DELIVERY&ps=1',
    address: '195 Troy-Schenectady Rd, Latham, NY 12110',
    phone: '518-300-1700',
	menus: [
      // { pdf: TB_NG_BRUNCH_MENU, name: 'Brunch Menu' },
      { pdf: TB_NG_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      {
        pdf: TB_KIDS_MENU,
        name: 'Kids Menu',
      },
      { pdf: TB_NG_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],
    coordinates: { lat: 42.740589791741044, lng: -73.73273051349403 },
    hoursFull: "Mon (Closed), Tues-Fri 4pm-11pm, Sat 10am-11pm, Sun 10am-9pm",
    about: false,
    promotions: [],
    amenities: getAmenitiesForLocation("latham"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.latham,
		nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Bay 3', price: '$50 per hour' },
        { name: 'Bay 4', price: '$50 per hour' },
        { name: 'Bay 5', price: '$50 per hour' },
        { name: 'Front 9 Bay 1', price: '$60 per hour' },
        { name: 'Front 9 Bay 2', price: '$60 per hour' },
        { name: 'VIP Suite North (Private)', price: '$100 per hour' },
        { name: 'VIP Suite South (Private)', price: '$100 per hour' },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Bay 3', price: '$60 per hour' },
        { name: 'Bay 4', price: '$60 per hour' },
        { name: 'Bay 5', price: '$60 per hour' },
        { name: 'Front 9 Bay 1', price: '$60 per hour' },
        { name: 'Front 9 Bay 2', price: '$60 per hour' },
        { name: 'VIP Suite North (Private)', price: '$100 per hour' },
        { name: 'VIP Suite South (Private)', price: '$100 per hour' },
      ],
    },
  },

  /*
   *    North Greenbush 3
   */
  {
    images: [
      northgreenbush_main,
      northgreenbush_1,
      northgreenbush_2,
      northgreenbush_3,
      northgreenbush_4,
    ],
    id: 'northgreenbush',
	careerEmails: ['careers@getinthebunker.golf', 'ngmanager@getinthebunker.golf'],
    menus: [
      // { pdf: TB_NG_BRUNCH_MENU, name: 'Brunch Menu' },
      { pdf: TB_NG_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      {
        pdf: TB_KIDS_MENU,
        name: 'Kids Menu',
      },
      { pdf: TB_NG_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],
    url: 'https://thebunker-teefindr-live.web.app/location/thebunker/thebunkernorthgreenbush-vF8VJfondldMD1q7uRWH',
    email: 'info@GetInTheBunker.golf',
    name: 'North Greenbush',
    address: '490 North Greenbush RD, Rensselaer, NY 12144',
    phone: '(518) 874 4018',
    hoursFull: "Tues-Thurs 4pm-11pm, Fri 11am-11pm, Sat 10am-11pm, Sun 10am-8pm",
    nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$70 per hour' },
        { name: 'Viking Room (Private)', price: '$70 per hour' },
        { name: 'Bay 3', price: '$50 per hour' },
        { name: 'Bay 4', price: '$50 per hour' },
        { name: 'Bay 5', price: '$50 per hour' },
        { name: 'VIP Suite (Private)', price: '$100 per hour' },
        { name: 'Blue Devil Room (Private)', price: '$80 per hour' },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$70 per hour' },
        { name: 'Viking Room (Private)', price: '$70 per hour' },
        { name: 'Bay 3', price: '$60 per hour' },
        { name: 'Bay 4', price: '$60 per hour' },
        { name: 'Bay 5', price: '$60 per hour' },
        { name: 'VIP Suite (Private)', price: '$100 per hour' },
        { name: 'Blue Devil Room (Private)', price: '$80 per hour' },
      ],
    },
    mealeo: 'https://order.getinthebunker.menu/r/67290',
		doordash: 'https://www.doordash.com/store/the-bunker-rensselaer-34197621/67169146/',
		ubereats: 'https://www.ubereats.com/store/the-bunker-north-greenbush/hj1L9EVDXIGiZUrTSMcY_w?diningMode=DELIVERY&ps=1',
    coordinates: { lat: 42.658434902970534, lng: -73.69341027159967 },
    promotions: [
      {
        title: 'VIP Suite Discount',
        body: 'VIP Suite $70 Monday-Thursday with 4 players or less',
      },
    ],
    amenities: getAmenitiesForLocation("northgreenbush"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.northgreenbush,
  },

  /*
   *    New Hartford 4
   */
  {
    images: [
      newhartford_main,
      newhartford_1,
      newhartford_2,
      newhartford_3,
      newhartford_4,
    ],
    id: 'newhartford',
		careerEmails: ['careers@getinthebunker.golf', 'newhartfordmanager@getinthebunker.golf'],
    menus: [
      // { pdf: TB_NH_BRUNCH_MENU, name: 'Brunch Menu' },
      { pdf: TB_NH_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      {
        pdf: TB_KIDS_MENU,
        name: 'Kids Menu',
      },
      { pdf: TB_NH_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],
    url: 'https://order.online/store/the-bunker-new-hartford-34115831/?delivery=true&hideModal=true',
    email: 'info@GetInTheBunker.golf',
    name: 'New Hartford',
    address: '8653 Clinton St, New Hartford, NY 13413',
		doordash: 'https://order.online/store/the-bunker-new-hartford-34115831/?delivery=true&hideModal=true',
		// grubhub: 'https://www.grubhub.com/restaurant/the-bunker-8653-clinton-st-new-hartford/11267416',
		ubereats: 'https://www.ubereats.com/store/the-bunker-new-hartford/gJXHiH40Rqa14Cau_qbNnA?diningMode=DELIVERY&ps=1&sc=SEARCH_SUGGESTION',
    phone: '(315) 864 3108',
    hoursFull: "Tues-Fri 4pm-11pm, Sat 10am-11pm, Sun 10am-8pm",
    nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Hole 1', price: '$50 per hour' },
        { name: 'Hole 2', price: '$50 per hour' },
        { name: 'Hole 3', price: '$50 per hour' },
        { name: 'Hole 4', price: '$50 per hour' },
        { name: 'Hole 5', price: '$50 per hour' },
        { name: 'Hole 6', price: '$50 per hour' },
        { name: 'VIP Suite (Private)', price: '$70 per hour' },
        {
          name: 'Spartan Room',
          price: '$80 per hour',
        },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Hole 1', price: '$60 per hour' },
        { name: 'Hole 2', price: '$60 per hour' },
        { name: 'Hole 3', price: '$60 per hour' },
        { name: 'Hole 4', price: '$60 per hour' },
        { name: 'Hole 5', price: '$60 per hour' },
        { name: 'Hole 6', price: '$60 per hour' },
        { name: 'VIP Suite (Private)', price: '$100 per hour' },
        { name: 'Spartan Room', price: '$80 per hour' },
      ],
    },
    // mealeo: 'https://order.getinthebunker.menu/r/67290',
		gloriaFoodUrl: 'https://www.fbgcdn.com/embedder/js/ewm2.js',
    coordinates: { lat: 43.090492845567816, lng: -75.31534266256405 },
    promotions: [
      {
        title: 'VIP Suite Discount',
        body: 'VIP Suite $70 Monday-Thursday with 4 players or less',
      },
      // {
      //   title: 'BOGO Golf, Drinks, & Apps',
      //   body: 'Wednesday-Friday 4-6pm',
      // },
    ],
    amenities: getAmenitiesForLocation("newhartford"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.newhartford,
  },

  /*
   *    Mohawk Harbor 5
   */
  {
    images: [
      mohawkharbor_main,
      mohawkharbor_1,
      mohawkharbor_2,
      mohawkharbor_3,
      mohawkharbor_4,
    ],
    id: 'mohawkharbor',
	careerEmails: ['careers@getinthebunker.golf', 'christian@getinthebunker.golf'],
    menus: [
      { pdf: TB_MH_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      { pdf: TB_KIDS_MENU, name: 'Kids Menu' },
      { pdf: TB_MH_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],

    url: 'https://thebunker-teefindr-live.web.app/location/thebunker/thebunkermohawkharbor-VX2ZFJ7ucPkOMv8JYKlV',
    email: 'info@GetInTheBunker.golf',
    name: 'Mohawk Harbor',
    address: '221 Harborside Dr, Schenectady, NY 12305',
    phone: '(518) 348-9993',
		ubereats: 'https://www.ubereats.com/store/the-bunker-mohawk-harbor/CQFPLk3uWl2X5_SrLBZIIg?diningMode=DELIVERY',
		doordash: 'https://www.doordash.com/store/the-bunker-schenectady-34236299/67816547/?cursor=eyJzZWFyY2hfaXRlbV9jYXJvdXNlbF9jdXJzb3IiOnsicXVlcnkiOiJ0aGUgYnVua2VyICIsIml0ZW1faWRzIjpbXSwic2VhcmNoX3Rlcm0iOiJ0aGUgYnVua2VyIiwidmVydGljYWxfaWQiOi05OTksInZlcnRpY2FsX25hbWUiOiJhbGwifSwic3RvcmVfcHJpbWFyeV92ZXJ0aWNhbF9pZHMiOlsxLDRdfQ==&pickup=false',
		riverHouse: 'https://www.clover.com/online-ordering/the-bunker-mohawk-harbor-schenectady',
    hoursFull: "Mon 4pm-11pm, Tues-Fri 4pm-11pm, Sat 10am-11pm, Sun 10am-8pm",
    nonPeakRates: {
      // range: 'Mon - Fri 9am - 3pm',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$60 per hour' },
        { name: 'Bay 2', price: '$60 per hour' },
        { name: 'Vegas Room', price: '$80 per hour' },
        { name: 'Players Club', price: '$90 per hour' },
        { name: 'Players Club Darts', price: '$50 per hour' },
        { name: 'Dart Board 1', price: '$20 per hour' },
        { name: 'Dart Board 2', price: '$20 per hour' },
        { name: 'Dart Board 3', price: '$20 per hour' },
      ],
    },
    peakRates: {
      // range: 'Mon - Fri 3pm - 11pm (Sat, Sun & Holidays All Day)',
      range: '',
      bays: [
        { name: 'Bay 1', price: '$70 per hour' },
        { name: 'Bay 2', price: '$70 per hour' },
        { name: 'Vegas Room', price: '$80 per hour' },
        { name: 'Players Club', price: '$90 per hour' },
        { name: 'Players Club Darts', price: '$50 per hour' },
        { name: 'Dart Board 1', price: '$20 per hour' },
        { name: 'Dart Board 2', price: '$20 per hour' },
        { name: 'Dart Board 3', price: '$20 per hour' },
      ],
    },
    // mealeo: 'https://order.getinthebunker.menu/r/67290',
    coordinates: { lat: 42.82568003210177, lng: -73.93242664418067 },
    promotions: [],
    amenities: getAmenitiesForLocation("mohawkharbor"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.mohawkharbor,
  },

  /*
   *    Saratoga 6
   */
  {
    images: [
      'https://storage.googleapis.com/thebunker-assets/thebunker/saratoga/IMG-86.jpg',
      'https://storage.googleapis.com/thebunker-assets/thebunker/saratoga/main.png',
      'https://storage.googleapis.com/thebunker-assets/thebunker/saratoga/IMG-9.jpg',
      'https://storage.googleapis.com/thebunker-assets/thebunker/saratoga/IMG-1.jpg',
      'https://storage.googleapis.com/thebunker-assets/thebunker/saratoga/IMG-10.jpg',
    ],
    id: 'saratoga',
	careerEmails: ['careers@getinthebunker.golf', 'saratogamanager@getinthebunker.golf'],
    menus: [
      // { pdf: TB_S_BRUNCH_MENU, name: 'Brunch Menu' },
      // {
      //   pdf: TB_S_MENU,
      //   name: 'Main Menu',
      // },
      // {
      //   pdf: TB_SARATOGA_DESSERT_MENU,
      //   name: 'Dessert Menu',
      // },
      // {
      //   pdf: TB_S_KIDS_MENU,
      //   name: 'Kids Menu',
      // },
      // { pdf: TB_S_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },

		{ pdf: TB_MH_MENU, name: 'Main Menu' },
      { pdf: TB_BASE_DESSERT_MENU, name: 'Dessert Menu' },
      { pdf: TB_KIDS_MENU, name: 'Kids Menu' },
      { pdf: TB_MH_SPECIALTY_DRINKS_MENU, name: 'Specialty Drinks' },
    ],
    url: '/location/saratoga',
    email: 'info@GetInTheBunker.golf',
    name: 'Saratoga',
    address: '307 Broadway, Saratoga Springs, NY 12866',
    phone: '(518) 245-6480',
    hoursFull: "Mon-Thurs 11am-11pm, Fri 11am-12am, Sat 10am-12am, Sun 10am-9pm",
		ubereats: 'https://www.ubereats.com/store/the-bunker-saratoga-springs/drloiwDKXa-dnlmQ_u8cxg?diningMode=DELIVERY&sc=SEARCH_SUGGESTION',
		doordash: 'https://www.doordash.com/store/the-bunker-saratoga-springs-34230055/',
    nonPeakRates: {
      range: '',
      bays: [
        {
          name: 'BAY 1',
          price: '$60 per hour',
        },
        {
          name: 'BAY 2',
          price: '$60 per hour',
        },
        {
          name: 'BAY 3',
          price: '$60 per hour',
        },
        {
          name: 'BAY 4',
          price: '$60 per hour',
        },
        {
          name: 'BAY 5',
          price: '$65 per hour',
        },
        {
          name: 'BAY 6',
          price: '$65 per hour',
        },
        {
          name: 'VIP SUITE',
          price: '$160 per hour',
        },
      ],
    },
    peakRates: {
      range: '',
      bays: [
        {
          name: 'BAY 1',
          price: '$75 per hour',
        },
        {
          name: 'BAY 2',
          price: '$75 per hour',
        },
        {
          name: 'BAY 3',
          price: '$75 per hour',
        },
        {
          name: 'BAY 4',
          price: '$75 per hour',
        },
        {
          name: 'BAY 5',
          price: '$80 per hour',
        },
        {
          name: 'BAY 6',
          price: '$80 per hour',
        },
        {
          name: 'VIP SUITE',
          price: '$160 per hour',
        },
      ],
    },
    coordinates: {
      lat: 43.07896181183951,
      lng: -73.78634854815526,
    },
    promotions: [],
    amenities: getAmenitiesForLocation("saratoga"),
    virtualTourUrl: VIRTUAL_TOUR_URLS.saratoga,
  },
];

const locationsById = locations.reduce<Record<string, LocationRecord>>(
  (acc, location) => {
    if (location.id) {
      acc[location.id] = location;
    }
    return acc;
  },
  {},
);

export const FALLBACK_LOCATIONS = locations;
export const FALLBACK_LOCATION_MAP = locationsById;

export type { LocationRecord };

export default FALLBACK_LOCATIONS;
