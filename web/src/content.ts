// Public content for the Seattle MasterFix app — company facts verified
// against seattlemasterfix.com and the Design & Build Guideline (v1.0).
// No fixed prices anywhere: the final price always comes from the written
// estimate, per the guideline.

import heroImg from "./assets/hero.jpg";
import sidingImg from "./assets/siding.jpg";
import fencingImg from "./assets/fencing.jpg";
import tileImg from "./assets/tile.jpg";
import flooringImg from "./assets/flooring.jpg";
import drywallImg from "./assets/drywall.jpg";
import paintImg from "./assets/paint.jpg";
import remodelImg from "./assets/remodel.jpg";

export const COMPANY = {
  name: "Seattle MasterFix",
  tagline: "Precision Craftsmanship",
  address: "5415 6th Ave NW, Seattle, WA 98107",
  phoneDisplay: "(206) 550-4576",
  phoneHref: "tel:+12065504576",
  email: "Bill@seattlemasterfix.com",
  waReg: "SEATTMP744NL",
  ubi: "605-904-953",
  hours: [
    { days: "Monday – Friday", time: "8:00 AM – 6:00 PM" },
    { days: "Saturday", time: "9:00 AM – 5:00 PM" },
    { days: "Sunday", time: "Closed" },
  ],
  replyNote: "We usually reply within 1 hour during business hours.",
  googleReviewUrl: "https://share.google/nP2m5EEOoNouPY9bX",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=5415+6th+Ave+NW+Seattle+WA+98107",
};

export interface Service {
  slug: string;
  name: string;
  short: string;
  image: string;
  imageAlt: string;
  included: string[];
  excluded: string[];
  costDrivers: string[];
}

const PROCESS = [
  "Site visit — we look at the work in person and measure.",
  "Written estimate — a formal, signable agreement with the full scope and price.",
  "The work — scheduled, documented with dated photos as it progresses.",
  "Walkthrough — we review the finished work with you before final payment.",
];

export const SERVICES: Service[] = [
  {
    slug: "siding",
    name: "Siding",
    short: "Repair and replacement that keeps Seattle rain out and curb appeal up.",
    image: sidingImg,
    imageAlt: "Craftsman home with cedar shingle siding and white trim",
    included: [
      "Full and partial siding replacement",
      "Cedar and fiber-cement siding",
      "Rot and water-damage repair",
      "Trim, flashing, and weather barrier",
      "Caulking and paint-ready finish",
    ],
    excluded: ["Structural framing rebuilds beyond the siding scope", "Roofing work"],
    costDrivers: [
      "Square footage and number of stories",
      "Material choice (cedar vs. fiber cement)",
      "How much rot or water damage is found underneath",
      "Trim, corners, and window detailing",
    ],
  },
  {
    slug: "fencing",
    name: "Fencing",
    short: "Cedar privacy fences and gates, built straight and set to last.",
    image: fencingImg,
    imageAlt: "Newly built cedar privacy fence in a residential backyard",
    included: [
      "Cedar privacy fencing",
      "Gates, latches, and hardware",
      "Post setting in concrete",
      "Removal and haul-away of the old fence",
      "Board-on-board and horizontal styles",
    ],
    excluded: ["Property-line surveys", "Retaining walls over 4 feet"],
    costDrivers: [
      "Linear footage and fence height",
      "Number of gates",
      "Slope and ground conditions",
      "Old fence removal and disposal",
    ],
  },
  {
    slug: "tile",
    name: "Tile",
    short: "Showers, floors, and backsplashes set tight, level, and waterproofed.",
    image: tileImg,
    imageAlt: "Walk-in shower with stacked wall tile, bench, and mosaic floor",
    included: [
      "Shower and tub surrounds",
      "Bathroom and kitchen floors",
      "Backsplashes",
      "Waterproofing membrane and proper substrate",
      "Grout and sealant",
    ],
    excluded: ["Plumbing relocation", "Glass shower door supply and install"],
    costDrivers: [
      "Tile size, pattern, and material",
      "Shower niches, benches, and curb work",
      "Condition of the existing substrate",
      "Demo and disposal of old tile",
    ],
  },
  {
    slug: "flooring",
    name: "Laminate Flooring",
    short: "Laminate and plank floors installed with clean transitions and trim.",
    image: flooringImg,
    imageAlt: "Living room with newly installed wood-look laminate flooring",
    included: [
      "Laminate and luxury plank installation",
      "Underlayment and moisture barrier",
      "Baseboards and transition strips",
      "Subfloor leveling within scope",
      "Removal of old flooring",
    ],
    excluded: ["Subfloor structural repair", "Hardwood refinishing"],
    costDrivers: [
      "Square footage and room layout",
      "Stairs and hallway cuts",
      "Subfloor condition",
      "Baseboard replacement vs. reuse",
    ],
  },
  {
    slug: "drywall",
    name: "Drywall",
    short: "Patches to full rooms — taped, textured, and matched to your walls.",
    image: drywallImg,
    imageAlt: "Worker sanding taped drywall seams during a repair",
    included: [
      "Water-damage and hole repair",
      "New drywall hanging and finishing",
      "Texture matching, including knockdown",
      "Ceiling repair",
      "Prime-ready smooth finish",
    ],
    excluded: ["Repair of the leak source itself (plumbing/roofing)", "Asbestos abatement"],
    costDrivers: [
      "Size and number of damaged areas",
      "Ceiling vs. wall work",
      "Texture matching difficulty",
      "Whether the damage source has been fixed",
    ],
  },
  {
    slug: "paint",
    name: "Interior / Exterior Paint",
    short: "Careful prep, clean lines, and finishes that hold up in the Northwest.",
    image: paintImg,
    imageAlt: "Painter rolling interior wall paint in a bright room",
    included: [
      "Interior walls, ceilings, and trim",
      "Exterior siding and trim paint",
      "Surface prep: patching, sanding, caulking, priming",
      "Floor, furniture, and landscaping protection",
      "Two-coat finish as specified in the estimate",
    ],
    excluded: ["Lead-paint abatement", "Cabinet refinishing unless listed in the estimate"],
    costDrivers: [
      "Square footage and ceiling height",
      "Number of colors and sheen changes",
      "Amount of prep and repair needed",
      "Exterior access and number of stories",
    ],
  },
  {
    slug: "remodel",
    name: "Remodel Build-Outs",
    short: "Kitchens, bathrooms, and room build-outs run as one coordinated job.",
    image: remodelImg,
    imageAlt: "Remodeled kitchen with new cabinetry and countertops",
    included: [
      "Kitchen and bathroom remodels",
      "Basement and room build-outs",
      "Cabinet, counter, and fixture installation",
      "Coordinated tile, flooring, drywall, and paint",
      "One written agreement covering the full scope",
    ],
    excluded: ["Architectural drawings and engineering", "Permit fees charged by the city"],
    costDrivers: [
      "Scope: cosmetic refresh vs. layout change",
      "Fixture and finish selections",
      "Electrical or plumbing moves",
      "Permit and inspection requirements",
    ],
  },
];

export { PROCESS };

export interface ProjectPhoto {
  image: string;
  alt: string;
  service: string;
  title: string;
  scope: string;
}

export const PROJECTS: ProjectPhoto[] = [
  {
    image: heroImg,
    alt: "Craftsman home with cedar shake siding, stone foundation, and wood-framed windows",
    service: "Siding",
    title: "Cedar shake siding",
    scope: "Full exterior re-side with cedar shakes, trim, and stone foundation work.",
  },
  {
    image: tileImg,
    alt: "Walk-in shower with stacked wall tile, bench, and mosaic floor",
    service: "Tile",
    title: "Tiled walk-in shower",
    scope: "Waterproofed walk-in shower with bench, niche, and mosaic floor tile.",
  },
  {
    image: remodelImg,
    alt: "Remodeled kitchen with new cabinetry and countertops",
    service: "Remodel",
    title: "Kitchen build-out",
    scope: "Cabinet and countertop installation with full finish work.",
  },
  {
    image: fencingImg,
    alt: "Newly built cedar privacy fence in a residential backyard",
    service: "Fencing",
    title: "Cedar privacy fence",
    scope: "New cedar privacy fence with posts set in concrete.",
  },
  {
    image: flooringImg,
    alt: "Living room with newly installed wood-look laminate flooring",
    service: "Flooring",
    title: "Laminate throughout",
    scope: "Wood-look laminate installed through the main living area.",
  },
  {
    image: paintImg,
    alt: "Painter rolling interior wall paint in a bright room",
    service: "Paint",
    title: "Interior repaint",
    scope: "Walls and ceilings prepped, primed, and painted.",
  },
  {
    image: drywallImg,
    alt: "Worker sanding taped drywall seams during a repair",
    service: "Drywall",
    title: "Drywall repair in progress",
    scope: "Taping and sanding ahead of texture match and paint.",
  },
  {
    image: sidingImg,
    alt: "Craftsman home with cedar shingle siding and white trim",
    service: "Siding",
    title: "Shingle siding and trim",
    scope: "Cedar shingle siding with new white trim and porch detailing.",
  },
];

export const PROJECT_FILTERS = ["All", "Siding", "Fencing", "Tile", "Flooring", "Drywall", "Paint", "Remodel"];

export const SERVICE_AREA = {
  summary: "Seattle and all of King County.",
  highlighted: ["Ballard", "Greenwood", "Ravenna", "North Seattle"],
  note: "Ballard, Greenwood, Ravenna, and North Seattle are our home turf. If your ZIP is outside King County, send the request anyway — we will tell you honestly whether we can take the job.",
};

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Are you licensed and insured?",
    a: `Yes. Seattle MasterFix is a licensed Washington contractor, WA Reg. ${COMPANY.waReg}, UBI ${COMPANY.ubi}. You can verify our registration with Washington L&I.`,
  },
  {
    q: "How does pricing work?",
    a: "Every job is priced in a written, signable estimate after a site visit — by the project, never by the hour. The estimate lists the full scope, materials, exclusions, deposit, and payment schedule before you sign anything.",
  },
  {
    q: "Do you charge for estimates?",
    a: "No. Estimate requests and site visits are free.",
  },
  {
    q: "How fast will I hear back?",
    a: "We usually reply within 1 hour during business hours (Mon–Fri 8–6, Sat 9–5).",
  },
  {
    q: "What warranty do I get?",
    a: "A 1-year labor warranty on our work, starting from the completion walkthrough. Your warranty start date appears in the My Job section once your job is complete.",
  },
  {
    q: "What is the deposit?",
    a: "The deposit is stated in your written estimate and is due on signing. The balance schedule — including the final due date — is written into the same agreement.",
  },
  {
    q: "What if the scope changes mid-job?",
    a: "Changes are handled as written change orders. You see what changed and the price difference, and you approve or decline in writing before that work proceeds.",
  },
  {
    q: "Who supplies materials?",
    a: "It is spelled out in your estimate — which materials we supply and which, if any, you supply. Nothing is assumed.",
  },
  {
    q: "How do I follow my job's progress?",
    a: "In the My Job tab: schedule, milestones, dated crew photos, documents, payment status, and a message thread with the office — all in one place.",
  },
  {
    q: "What areas do you serve?",
    a: "Seattle and King County, with Ballard, Greenwood, Ravenna, and North Seattle as our home turf.",
  },
];
