export type FeatureScreen = string | null;

export const CATS = [
  { id: 'all',        color: '#021B3A' },
  { id: 'financial',  color: '#27AE60' },
  { id: 'legal',      color: '#3498DB' },
  { id: 'operations', color: '#E67E22' },
  { id: 'community',  color: '#9B59B6' },
  { id: 'tools',      color: '#1ABC9C' },
  { id: 'career',     color: '#F39C12' },
] as const;

export type CatId = typeof CATS[number]['id'];

export interface Feature {
  icon: string;
  label: string;
  color: string;
  desc: string;
  screen: FeatureScreen;
  cat: CatId;
}

export const FEATURES: Feature[] = [
  // Financial
  { icon: 'bar-chart-outline',      label: 'Profit & Loss',       color: '#9B59B6', desc: 'Revenue & expenses',         screen: 'ProfitLoss',       cat: 'financial'  },
  { icon: 'calculator-outline',     label: 'Tax Calculator',      color: '#27AE60', desc: 'One-button tax prep',        screen: 'TaxCalculator',    cat: 'financial'  },
  { icon: 'receipt-outline',        label: 'Expenses',            color: '#E74C3C', desc: 'Track all your costs',       screen: 'Expenses',         cat: 'financial'  },
  { icon: 'globe-outline',          label: 'IFTA Tracker',        color: '#16A085', desc: 'Quarterly fuel tax',         screen: 'IFTATracker',      cat: 'financial'  },
  { icon: 'water-outline',          label: 'Fuel Log',            color: '#1ABC9C', desc: 'Track fuel spend',           screen: 'FuelLog',          cat: 'financial'  },
  { icon: 'map-outline',            label: 'Trip Log',            color: '#3498DB', desc: 'Log every load & run',       screen: 'TripLog',          cat: 'financial'  },
  { icon: 'wallet-outline',         label: 'Per Diem',            color: '#27AE60', desc: 'IRS tax deduction',          screen: 'PerDiem',          cat: 'financial'  },
  { icon: 'receipt-outline',        label: 'Invoice Generator',   color: '#F39C12', desc: 'Create & export invoices',   screen: 'Invoice',          cat: 'financial'  },
  { icon: 'analytics-outline',      label: 'AI Rate Advisor',     color: '#E67E22', desc: 'Is this rate worth it?',     screen: 'AILoadRate',       cat: 'financial'  },
  { icon: 'calculator-outline',     label: 'Trip Profit Calc',    color: '#27AE60', desc: 'GO / CAUTION / PASS verdict', screen: 'TripProfit',       cat: 'financial'  },
  { icon: 'pulse-outline',          label: 'Rate Benchmark',      color: '#16A085', desc: 'Market rates by lane',       screen: 'RateBenchmark',    cat: 'financial'  },
  { icon: 'cash-outline',           label: 'Payment Tracker',     color: '#CC0000', desc: 'Track invoice payments',     screen: 'PaymentTracker',   cat: 'financial'  },
  { icon: 'calculator-outline',     label: 'Quarterly Taxes',     color: '#8E44AD', desc: 'Estimated 1040-ES payment',  screen: 'QuarterlyTax',     cat: 'financial'  },
  { icon: 'trending-up-outline',    label: 'Rate Tools',          color: '#F39C12', desc: 'Broker & lane rates',        screen: 'RateTools',        cat: 'financial'  },
  { icon: 'git-compare-outline',    label: 'Load Compare',        color: '#3498DB', desc: 'Side-by-side loads',         screen: 'LoadCompare',      cat: 'financial'  },
  { icon: 'cube-outline',           label: 'Load Board',          color: '#F39C12', desc: 'Track your loads',           screen: 'LoadBoard',        cat: 'financial'  },
  { icon: 'stopwatch-outline',      label: 'Detention Tracker',   color: '#C0392B', desc: 'Clock in/out & pay',         screen: 'DetentionTracker', cat: 'financial'  },
  // Legal
  { icon: 'shield-checkmark-outline', label: 'AI Legal Assistant', color: '#3498DB', desc: 'Ask legal questions',      screen: 'AILegal',          cat: 'legal'      },
  { icon: 'library-outline',          label: 'State Law',          color: '#1ABC9C', desc: 'All 50 states',            screen: 'StateLaw',         cat: 'legal'      },
  { icon: 'hammer-outline',           label: 'Ticket Dispute',     color: '#E67E22', desc: 'Fight your tickets',       screen: 'TicketDispute',    cat: 'legal'      },
  { icon: 'document-text-outline',    label: 'Smart Forms',        color: '#9B59B6', desc: 'Contracts & docs',         screen: 'SmartForms',       cat: 'legal'      },
  { icon: 'people-outline',           label: 'Driver Protection',  color: '#E74C3C', desc: 'Coercion & wellness',      screen: 'DriverProtection', cat: 'legal'      },
  { icon: 'business-outline',         label: 'Corp Startups',      color: '#2ECC71', desc: 'LLC & EIN filing',         screen: 'CorpStartups',     cat: 'legal'      },
  { icon: 'alert-circle-outline',     label: 'Cargo Claims',       color: '#E67E22', desc: 'Track damage & loss',      screen: 'CargoClaim',       cat: 'legal'      },
  { icon: 'newspaper-outline',        label: 'Bill of Lading',     color: '#9B59B6', desc: 'Generate BOL PDF',         screen: 'BillOfLading',     cat: 'legal'      },
  { icon: 'star-outline',             label: 'Broker Notes',       color: '#F1C40F', desc: 'Rate your brokers',        screen: 'BrokerNotes',      cat: 'legal'      },
  // Operations
  { icon: 'timer-outline',            label: 'HOS Tracker',        color: '#16A085', desc: '70/60-hr cycle log',       screen: 'HOSTracker',       cat: 'operations' },
  { icon: 'hourglass-outline',        label: 'HOS Countdown',      color: '#E74C3C', desc: 'Live drive time left',     screen: 'HOSCountdown',     cat: 'operations' },
  { icon: 'notifications-outline',    label: 'HOS Alerts',         color: '#E74C3C', desc: 'Driving limit alerts',     screen: 'HOSAlerts',        cat: 'operations' },
  { icon: 'clipboard-outline',        label: 'DVIR Inspection',    color: '#2ECC71', desc: 'Pre/post-trip reports',    screen: 'DVIR',             cat: 'operations' },
  { icon: 'radio-button-on-outline',  label: 'ELD Status',         color: '#E74C3C', desc: 'Duty status + HOS sync',   screen: 'ELDStatus',        cat: 'operations' },
  { icon: 'construct-outline',        label: 'Maintenance',        color: '#E67E22', desc: 'Track service & repairs',  screen: 'Maintenance',      cat: 'operations' },
  { icon: 'flask-outline',            label: 'Drug & Alcohol Log', color: '#9B59B6', desc: 'FMCSA test tracking',      screen: 'DrugTest',         cat: 'operations' },
  { icon: 'id-card-outline',          label: 'CDL Tracker',        color: '#E74C3C', desc: 'License expiration',       screen: 'CDLTracker',       cat: 'operations' },
  { icon: 'bus-outline',              label: 'My Truck',           color: '#8E44AD', desc: 'Rig profile & docs',       screen: 'TruckProfile',     cat: 'operations' },
  { icon: 'calendar-outline',         label: 'Driver Calendar',    color: '#8E44AD', desc: 'Never miss a deadline',    screen: 'Calendar',         cat: 'operations' },
  { icon: 'moon-outline',             label: 'Sleep & Fatigue',    color: '#8E44AD', desc: 'Rest compliance',          screen: 'SleepLog',         cat: 'operations' },
  // Community
  { icon: 'chatbubbles-outline',      label: 'Driver Chat',        color: '#3498DB', desc: 'Community channels',      screen: 'DriverChat',       cat: 'community'  },
  { icon: 'warning-outline',          label: 'Broker Blacklist',   color: '#CC0000', desc: 'Broker warnings',         screen: 'BrokerBlacklist',  cat: 'community'  },
  { icon: 'people-outline',           label: 'O/O Network',        color: '#1ABC9C', desc: 'Owner-operator community',screen: 'OwnerNetwork',     cat: 'community'  },
  { icon: 'earth-outline',            label: 'Trucker Map',        color: '#E74C3C', desc: 'Community intel map',     screen: 'TruckerMap',       cat: 'community'  },
  { icon: 'people-circle-outline',    label: 'Dispatch Contacts',  color: '#3498DB', desc: 'Dispatchers & brokers',   screen: 'DispatchContacts', cat: 'community'  },
  { icon: 'business-outline',         label: 'Shipper Directory',  color: '#16A085', desc: 'Shipper/receiver book',   screen: 'ShipperDirectory', cat: 'community'  },
  { icon: 'car-outline',              label: 'Parking Tracker',    color: '#E67E22', desc: 'Manage reservations',     screen: 'ParkingTracker',   cat: 'community'  },
  { icon: 'gift-outline',             label: 'Referral Program',   color: '#F1C40F', desc: 'Earn free months',        screen: 'Referral',         cat: 'community'  },
  { icon: 'ribbon-outline',           label: 'Partners & Sponsors',color: '#021B3A', desc: 'Trusted industry partners',screen: 'Sponsors',        cat: 'community'  },
  { icon: 'people-outline',           label: 'Fleet Owner Mode',   color: '#E74C3C', desc: 'Manage drivers & trucks',  screen: 'FleetOwner',       cat: 'community'  },
  { icon: 'globe-outline',            label: 'TRAC Community',     color: '#1ABC9C', desc: 'Driver-to-driver network', screen: 'TRACCommunity',    cat: 'community'  },
  // Tools
  { icon: 'language-outline',         label: 'Translator',         color: '#3498DB', desc: 'Translate in 16 languages',screen: 'Translator',      cat: 'tools'      },
  { icon: 'scale-outline',            label: 'Axle Weight',        color: '#E67E22', desc: 'Weight limit checker',    screen: 'AxleWeight',       cat: 'tools'      },
  { icon: 'navigate-outline',         label: 'Mileage Calculator', color: '#1ABC9C', desc: 'Distance, fuel & pay',    screen: 'MileageCalculator',cat: 'tools'      },
  { icon: 'scale-outline',            label: 'Weigh Stations',     color: '#E67E22', desc: 'WS on your route',        screen: 'WeighStation',     cat: 'tools'      },
  { icon: 'flame-outline',            label: 'Fuel Finder',        color: '#E67E22', desc: 'Cheapest fuel near you',  screen: 'FuelFinder',       cat: 'tools'      },
  { icon: 'partly-sunny-outline',     label: 'Route Weather',      color: '#3498DB', desc: 'Road conditions',         screen: 'Weather',          cat: 'tools'      },
  { icon: 'navigate-outline',         label: 'Trip Planner',       color: '#2980B9', desc: 'Plan route + fuel + HOS', screen: 'TripPlanner',      cat: 'tools'      },
  { icon: 'flame-outline',            label: 'Diesel Prices',      color: '#E74C3C', desc: 'EIA prices by region',    screen: 'FuelMap',          cat: 'tools'      },
  { icon: 'location-outline',         label: 'Find Help',          color: '#E74C3C', desc: 'Truck stops & repair',    screen: 'FindHelp',         cat: 'tools'      },
  { icon: 'document-outline',         label: 'Doc Generator',      color: '#9B59B6', desc: 'Rate conf, POD, invoice', screen: 'DocGenerator',     cat: 'tools'      },
  { icon: 'folder-outline',           label: 'Document Vault',     color: '#2C6EBD', desc: 'Store your docs',         screen: 'DocumentVault',    cat: 'tools'      },
  // Career
  { icon: 'stopwatch-outline',        label: 'CDL Challenge',      color: '#3498DB', desc: 'Timed skill challenges',  screen: 'CDLChallenge',     cat: 'career'     },
  { icon: 'star-outline',             label: 'Road Ready',         color: '#2C6EBD', desc: 'Driver score & rank',     screen: 'RoadReady',        cat: 'career'     },
  { icon: 'trophy-outline',           label: "America's Top Trucker", color: '#FFD700', desc: 'National competition',   screen: 'AmericasTopTrucker', cat: 'career'   },
  { icon: 'game-controller-outline',  label: 'Driver Games',       color: '#9B59B6', desc: 'Trivia & crosswords',     screen: 'Games',            cat: 'career'     },
  { icon: 'trophy-outline',           label: 'Driver Scorecard',   color: '#F1C40F', desc: 'Weekly performance',      screen: 'Scorecard',        cat: 'career'     },
  { icon: 'school-outline',           label: 'Student Driver',     color: '#1ABC9C', desc: 'CDL lessons & quizzes',   screen: 'StudentDriver',    cat: 'career'     },
  { icon: 'cube-outline',             label: 'Freight Career',     color: '#F39C12', desc: 'Accept loads, earn',      screen: 'FreightCareer',    cat: 'career'     },
  { icon: 'business-outline',         label: 'O/O Simulator',      color: '#9B59B6', desc: 'Run your own business',   screen: 'OOSim',            cat: 'career'     },
  { icon: 'star-outline',             label: 'CST Pro',            color: '#2C6EBD', desc: 'Upgrade your account',    screen: 'PremiumGate',      cat: 'career'     },
];
