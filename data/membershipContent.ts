export type MembershipFormContent = {
  formTitle: string;
  formDescription: string;
  agreementTitle: string;
  paymentOptions: string[];
  perksTitle: string;
  perks: string[];
  detailsTitle: string;
  details: string[];
  membershipTypeLabel: string;
  membershipTypes: string[];
  successTitle: string;
  successMessage: string;
  paymentLinkLabel: string;
  enrollmentTitle: string;
  enrollmentSteps: string[];
};

export const DEFAULT_MEMBERSHIP_CONTENT: MembershipFormContent = {
  formTitle: "Membership Accounts",
  formDescription: "Enrollment Step 1 - Complete the membership form. Enrollment Step 2 - Use the payment link after submission to complete payment.",
  agreementTitle: "Membership Agreement Payment Options",
  paymentOptions: [
    "$1500 for the season — one time payment (11/1/25-4/30/26) Over $6000 VALUE",
    "$275 per month — two month minimum",
    "$350 One Month, One Time ($1000 VALUE) — WOULD MAKE A GREAT GIFT",
  ],
  perksTitle: "Plenty of Perks!",
  perks: [
    "Gives you 60 minutes of simulator time in standard bays ONLY per day during non-peak hours. 10% off simulator time used beyond 60 minutes. Non-peak hours are Monday-Thursday from 9am-3pm ($1000 VALUE) excludes Holidays",
    "Members playing together can add their 60 minute time allocations. (e.g. 3 members can occupy one sim for 3 hours without incurring additional charges)",
    "10% off simulator time during peak times including guests (any bay)",
    "10% off food and beverage anytime",
    "10% off lessons/club fittings",
    "Club storage if available",
    "$100 OFF one party per year ($1000 min. spend)",
    "Can be used at any location",
    "Black card issued",
    "20% off apparel",
  ],
  detailsTitle: "Details",
  details: [
    "You CAN use your hour towards Non-peak golf league fees",
    "Cannot be used toward any peak leagye fees or tournaments and discounts do not apply to these fees as well",
    "Members must be present to utilize benefits",
    "Guests will be charged $15 per person during the first hour, the total cost paid by guest(s) will not exceed the listed hourly rate for the bay that will be used",
    "Membership is nontransferable and can only be used by member card holders. Violation will result in membership cancellation without a refund given",
    "Monthly membership will automatically be renewed for following month unless member gives one week notice to cancel",
  ],
  membershipTypeLabel: "Choose Membership Type",
  membershipTypes: [
    "Pay in Full for Year ($1500)",
    "Month to Month ($275) - 2 month minimum",
    "One Month, One Time ($350)",
  ],
  successTitle: "Membership request submitted",
  successMessage:
    "Thanks for reaching out! We received your membership request and will follow up shortly.",
  paymentLinkLabel: "Complete Payment",
  enrollmentTitle: "Enrollment",
  enrollmentSteps: [
    "Step 1: Complete the membership form.",
    "Step 2: Use the payment link after submission to complete payment.",
  ],
} as const;

export const DEFAULT_MEMBERSHIP_FAQS = [
  {
    question: "What are your membership hours?",
    answer:
      "Our facility is open Monday through Thursday from 9 am-3 pm. Excludes Holidays. Please check our website for any special holiday hours.",
  },
  {
    question: "How do I book simulator time?",
    answer:
      "You can book simulator time through our website or by calling any one of our locations. Advance booking is recommended, especially during peak hours.",
  },
  {
    question: "What are peak and non-peak hours?",
    answer:
      "Peak Hours: Weekdays anytime after 3 pm, weekends & any major holidays. Non-Peak Hours: Monday to Friday, 9 am to 3 pm excluding holidays.",
  },
  {
    question: "Can I bring guests?",
    answer:
      "Absolutely! Guests are welcome. Please note there is a fee of $15 per person for the first hour, and any extra hours can be split among members and guests with a 10 percent discount.",
  },
  {
    question: "What is included in the membership?",
    answer:
      "Membership includes 60 minutes of simulator time per day during non-peak hours, discounts on food, beverages, lessons, club fittings, and merchandise, as well as club storage (if available). Discounts will be applied to the entire bill as long as the group does not exceed 8 people.",
  },
  {
    question: "How can I cancel my monthly membership?",
    answer:
      "To cancel your monthly membership, please provide one week's notice before your next billing date. You can do this by contacting the store that purchased your membership.",
  },
  {
    question: "Can I use my membership benefits in private or VIP rooms?",
    answer:
      "You'll receive a 10% discount on any simulator time in the VIP suite or private rooms. However, the one free hour of simulator time during non-peak hours cannot be used in the VIP suite or private rooms.",
  },
  {
    question: "Do you serve food and beverages?",
    answer:
      "Yes! We offer a full menu of food and beverages. Members enjoy a 10% discount on any food and beverage purchases.",
  },
  {
    question: "Is my membership transferable?",
    answer:
      "No, memberships are non-transferable and can only be used by the cardholder. Violations will result in cancellation without a refund.",
  },
  {
    question: "What happens if I exceed my simulator time?",
    answer:
      "If you exceed your 60 minutes of simulator time during non-peak hours, you'll receive a 10% discount on any additional time used.",
  },
  {
    question: "Can I buy a membership as a gift?",
    answer:
      "Yes, our One-Month Gift Membership is a great option! It provides the same benefits as a regular membership but does not automatically renew.",
  },
  {
    question: "What happens if multiple members play together?",
    answer:
      "If multiple members are playing together, they can each use their one free hour of simulator time during non-peak hours collectively. For example, if three members are playing together, they would receive a total of three free hours during non-peak.",
  },
  {
    question: "Do I get any discounts for hosting a party as a member?",
    answer:
      "Yes! As a member, you're eligible for a 10% discount on one party booking per year. This discount can be applied to the total cost of the party, including simulator time, food, and beverages. Please note that this discount can only be used once per year and cannot be combined with any other promotions or discounts.",
  },
] as const;
