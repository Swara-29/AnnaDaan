export const translations = {
  en: {
    appName: "AnnaDaan",
    switchRole: "Switch Role",
    donorTitle: "Donor Dashboard",
    ngoTitle: "NGO Dashboard",
    volunteerTitle: "Volunteer Dashboard",
    adminTitle: "Admin Dashboard",
    ngoDispatch: "NGO Dispatch",
    smartQueue: "Smart priority queue ranks urgent donations first for faster rescue.",
    volunteerAssignments: "Active Assignments"
  },
  hi: {
    appName: "अन्नदान",
    switchRole: "रोल बदलें",
    donorTitle: "दाता डैशबोर्ड",
    ngoTitle: "एनजीओ डैशबोर्ड",
    volunteerTitle: "स्वयंसेवक डैशबोर्ड",
    adminTitle: "एडमिन डैशबोर्ड",
    ngoDispatch: "एनजीओ डिस्पैच",
    smartQueue: "स्मार्ट प्राथमिकता सूची तुरंत खत्म होने वाले दानों को ऊपर दिखाती है।",
    volunteerAssignments: "सक्रिय असाइनमेंट"
  },
  mr: {
    appName: "अन्नदान",
    switchRole: "भूमिका बदला",
    donorTitle: "दाता डॅशबोर्ड",
    ngoTitle: "एनजीओ डॅशबोर्ड",
    volunteerTitle: "स्वयंसेवक डॅशबोर्ड",
    adminTitle: "अ‍ॅडमिन डॅशबोर्ड",
    ngoDispatch: "एनजीओ डिस्पॅच",
    smartQueue: "स्मार्ट प्राधान्य यादीत तातडीच्या देणग्या आधी दिसतात.",
    volunteerAssignments: "सक्रिय कामे"
  }
};

export const t = (language, key) => translations[language]?.[key] || translations.en[key] || key;

