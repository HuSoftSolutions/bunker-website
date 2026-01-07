export type LessonsFeaturedPro = {
  name: string;
  role: string;
  bio: string;
  phone?: string;
  email?: string;
  image?: string;
};

export type LessonsAdditionalPro = {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  image?: string;
};

export type LessonsRate = {
  title: string;
  details: string[];
};

export type LessonsCoachProgram = {
  title: string;
  description: string;
  sessions: string[];
  cost: string;
};

export type LessonsTechnologyLink = {
  label: string;
  href: string;
};

export type LessonsContent = {
  hero: {
    title: string;
    subtitle: string;
    description: string;
  };
  intro: {
    eyebrow: string;
    title: string;
    description: string;
  };
  featuredPros: LessonsFeaturedPro[];
  meetThePros: {
    title: string;
    description: string;
  };
  additionalPros: LessonsAdditionalPro[];
  cta: {
    title: string;
    description: string;
    buttonLabel: string;
  };
  rates: {
    title: string;
    description: string;
    items: LessonsRate[];
  };
  coachPrograms: LessonsCoachProgram[];
  form: {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
    successTitle: string;
    successMessage: string;
    sentToLabel: string;
  };
  technology: {
    title: string;
    description: string;
    links: LessonsTechnologyLink[];
  };
  selectOptions: {
    locations: string[];
    timesOfDay: string[];
  };
};

export const LEGACY_LESSONS_CONTENT: LessonsContent = {
  hero: {
    title: "Lessons at The Bunker",
    subtitle: "With Our PGA Professionals",
    description:
      "Our coaching staff blends decades of experience, TrackMan technology, and hospitality-led service to help every golfer grow with confidence.",
  },
  intro: {
    eyebrow: "Premium Coaching Experiences",
    title: "Lessons at the Bunker",
    description:
      "TrackMan-powered instruction, custom practice plans, and pros who know how to make learning fun. Explore our coaching roster and book time with the team that fits your game best.",
  },
  featuredPros: [
    {
      name: "Sean Madden",
      role: "Director of Golf at The Bunker",
      bio: "Sean is a graduate of the PGM program at Methodist University and has been a member of the PGA of America since 2007. His experience spans multiple leadership roles across the golf industry, including Director of Golf for all Bunker locations. Sean is passionate about teaching and helping players elevate their game at every level.",
      phone: "838-280-0323",
      email: "sean@getinthebunker.golf",
      image: "/sean-headshot.png",
    },
    {
      name: "Phil Kaminski",
      role: "PGA Professional",
      bio: "Phil has dedicated his career to coaching and growing the game. A Methodist University PGA PGM graduate, his certifications include The Gray Institute's NG 360 FPS system, Penn State Biomechanics, and golf's American Development Model. Phil focuses on building confidence through purposeful, data-backed instruction.",
      email: "phil@getinthebunker.golf",
    },
  ],
  meetThePros: {
    title: "Meet the Pros",
    description:
      "From club fitting expertise to junior development specialists, The Bunker has coaches ready for every swing. Reach out to learn more about programming at your home location.",
  },
  additionalPros: [
    {
      name: "Brandon Risler",
      description:
        "Brandon has 10+ years of experience in the golf industry, most recently at Saratoga Golf and Polo. He is working toward his PGA membership and serves as a lead fitter with TaylorMade, coaching players of every skill level.",
    },
    { name: "Anthony Therrien" },
    { name: "Kay McMahon" },
    { name: "Angelo Cafaro" },
  ],
  cta: {
    title: "Book Your Lesson",
    description:
      "Reserve online to lock in time with our PGA professionals or connect with the team for custom packages.",
    buttonLabel: "Reach Out",
  },
  rates: {
    title: "Rates",
    description:
      "Transparent pricing for private instruction, on-course coaching, and multi-session programs.",
    items: [
      {
        title: "Individual",
        details: ["One Hour: $125", "Half Hour: $65"],
      },
      {
        title: "9 Hole Playing Lesson",
        details: [
          "$200 inside at any Bunker location or outdoors at Shaker Ridge Country Club or Olde Kinderhook Golf Club",
        ],
      },
    ],
  },
  coachPrograms: [
    {
      title: "Coach Program",
      description:
        "Our coaches will assess your game, define your goals, and build a step-by-step personalized plan for improvement. The program includes:",
      sessions: [
        "Pre-Lesson: Fill out and return the goal and self-assessment sheet to a Bunker coach.",
        "Lesson 1: Assessment of long game, short game, and goals review. 1 hour.",
        "Lesson 2: On-course evaluation, strategies, and mental/physical assessments. 2 ½ hours.",
        "Lesson 3: Private lesson working on the personalized program. 1 hour.",
        "Lesson 4: Continuation of private lessons. 1 hour.",
      ],
      cost: "Cost: $600 per student",
    },
    {
      title: "Coach Group Program",
      description:
        "Coaches will work with students in a group setting to improve their games. Each group receives 12 hours of instruction with 4-6 golfers per group:",
      sessions: [
        "Session 1: On-course assessment of the students' games. 2 ½ hours.",
        "Session 2: Group coaching on training protocols. 1 ½ hours.",
        "Session 3: On-course coaching focused on strategy and mental/physical preparation. 2 ½ hours.",
        "Session 4: Group coaching on training protocols. 1 ½ hours.",
        "Session 5: On-course coaching that brings training to the course. 2 ½ hours.",
        "Session 6: Final group coaching session on training protocols. 1 ½ hours.",
      ],
      cost: "Cost: $600 per student",
    },
  ],
  form: {
    eyebrow: "Lessons",
    title: "Interested in Lessons?",
    description:
      "Fill out the form and a member of our coaching staff will reach out with availability and next steps.",
    submitLabel: "Submit",
    successTitle: "Your inquiry has been sent to The Bunker!",
    successMessage: "",
    sentToLabel: "Sent to:",
  },
  technology: {
    title: "Technology We Use",
    description:
      "Explore the cutting-edge tools that power our instruction and help you understand every swing.",
    links: [
      { label: "Trackman", href: "https://www.trackman.com/" },
      { label: "Sportbox AI", href: "https://sportbox.ai/" },
      { label: "Hackmotion", href: "https://hackmotion.com/" },
    ],
  },
  selectOptions: {
    locations: [
      "Clifton Park",
      "Guilderland",
      "New Hartford",
      "North Greenbush",
      "Saratoga",
    ],
    timesOfDay: ["Morning", "Afternoon", "Evening"],
  },
};
