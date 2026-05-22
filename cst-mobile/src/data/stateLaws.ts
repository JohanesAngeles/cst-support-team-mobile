export interface StateRule {
  label: string;
  value: string;
}

export interface StateCategory {
  title: string;
  icon: string;
  color: string;
  rules: StateRule[];
}

export interface StateLawEntry {
  state: string;
  abbr: string;
  truckSpeed: string;
  dieselTax: string;
  categories: StateCategory[];
}

const w = (speed: string, diesel: string, height: string, notable: StateRule[]): StateCategory[] => [
  {
    title: 'Speed Limits',
    icon: 'speedometer-outline',
    color: '#3498DB',
    rules: [
      { label: 'Interstate (Trucks)', value: speed },
      { label: 'Rural 2-Lane', value: '55 mph' },
      { label: 'School Zone', value: '15–25 mph' },
    ],
  },
  {
    title: 'Weight & Size',
    icon: 'cube-outline',
    color: '#E67E22',
    rules: [
      { label: 'Max Gross Weight', value: '80,000 lbs' },
      { label: 'Single Axle', value: '20,000 lbs' },
      { label: 'Tandem Axle', value: '34,000 lbs' },
      { label: 'Max Width', value: '8.5 ft (102 in)' },
      { label: 'Max Height', value: height },
      { label: 'Max Trailer Length', value: '53 ft' },
    ],
  },
  {
    title: 'Fuel Tax (Diesel)',
    icon: 'water-outline',
    color: '#2ECC71',
    rules: [
      { label: 'State Diesel Tax', value: diesel },
      { label: 'IFTA Filing', value: 'Quarterly' },
      { label: 'Base Jurisdiction', value: 'Home state' },
    ],
  },
  {
    title: 'Permits',
    icon: 'document-text-outline',
    color: '#9B59B6',
    rules: [
      { label: 'Oversize (>8.5 ft wide)', value: 'Permit required' },
      { label: 'Overweight Permit', value: 'Available — contact state DOT' },
      { label: 'Trip Permit', value: '72-hr permit available' },
      { label: 'Annual Permit', value: 'Available for regular OW routes' },
    ],
  },
  {
    title: 'Key Regulations',
    icon: 'shield-checkmark-outline',
    color: '#E74C3C',
    rules: notable,
  },
];

export const STATE_LAWS: StateLawEntry[] = [
  {
    state: 'Alabama', abbr: 'AL', truckSpeed: '70 mph', dieselTax: '28.3¢/gal',
    categories: w('70 mph', '28.3¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weigh Stations', value: 'All CMVs must stop' },
      { label: 'HOS', value: 'Federal FMCSA rules apply' },
      { label: 'Hazmat Routes', value: 'State-designated routes required' },
    ]),
  },
  {
    state: 'Alaska', abbr: 'AK', truckSpeed: '65 mph', dieselTax: '9.25¢/gal',
    categories: w('65 mph', '9.25¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required in designated areas' },
      { label: 'Winter Roads', value: 'Ice road restrictions apply' },
      { label: 'Weight Limit', value: 'Seasonal restrictions on soft roads' },
      { label: 'Studded Tires', value: 'Allowed Sept 16 – Apr 30' },
    ]),
  },
  {
    state: 'Arizona', abbr: 'AZ', truckSpeed: '75 mph', dieselTax: '26¢/gal',
    categories: w('75 mph', '26¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on I-17, I-40 in snow' },
      { label: 'Gross Weight', value: '80,000 lbs (up to 96,000 with permit)' },
      { label: 'High Wind', value: 'Restrictions on I-10 near Lordsburg' },
      { label: 'HOS Exemption', value: '100 air-mile radius exemption available' },
    ]),
  },
  {
    state: 'Arkansas', abbr: 'AR', truckSpeed: '70 mph', dieselTax: '28.5¢/gal',
    categories: w('70 mph', '28.5¢/gal', '13.6 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 90,000 on state routes w/ permit' },
      { label: 'Ports of Entry', value: 'All CMVs must stop at open POEs' },
      { label: 'Seasonal Limits', value: 'Spring thaw weight reductions apply' },
    ]),
  },
  {
    state: 'California', abbr: 'CA', truckSpeed: '55 mph', dieselTax: '93.8¢/gal',
    categories: w('55 mph', '93.8¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'R1/R2/R3 chain controls on mountain passes' },
      { label: 'CARB Rules', value: 'Diesel trucks must meet CARB emissions' },
      { label: 'ZEV Mandate', value: '2024+ model year trucks must be zero-emission' },
      { label: 'CHP Weigh Stations', value: 'Mandatory for all CMVs' },
      { label: 'Truck Routes', value: 'LA area has designated truck-only routes' },
      { label: 'IFTA', value: 'CA is IFTA member — quarterly filing required' },
    ]),
  },
  {
    state: 'Colorado', abbr: 'CO', truckSpeed: '65 mph', dieselTax: '22¢/gal',
    categories: w('65 mph', '22¢/gal', '14.5 ft', [
      { label: 'Chain Law', value: 'Traction law — chains or 4WD required in mountains' },
      { label: 'Chain Stations', value: 'I-70 mountain corridor has mandatory chain checks' },
      { label: 'Weight Limit', value: '80,000 lbs; higher with permit on some routes' },
      { label: 'Hazmat', value: 'Tunnel restrictions on I-70 Eisenhower Tunnel' },
    ]),
  },
  {
    state: 'Connecticut', abbr: 'CT', truckSpeed: '65 mph', dieselTax: '49.2¢/gal',
    categories: w('65 mph', '49.2¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Truck Routes', value: 'Strict truck route restrictions in cities' },
      { label: 'Bridge Limits', value: 'Many older bridges have low weight limits' },
      { label: 'Overnight Parking', value: 'Restricted in many municipalities' },
    ]),
  },
  {
    state: 'Delaware', abbr: 'DE', truckSpeed: '65 mph', dieselTax: '22¢/gal',
    categories: w('65 mph', '22¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 90,000 on Delaware Turnpike' },
      { label: 'Truck Routes', value: 'Wilmington has truck route restrictions' },
      { label: 'Tolls', value: 'I-95 Delaware Turnpike — EZPass required' },
    ]),
  },
  {
    state: 'Florida', abbr: 'FL', truckSpeed: '65 mph', dieselTax: '19.3¢/gal',
    categories: w('65 mph', '19.3¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; sugar cane transport exempt' },
      { label: 'Hurricane Evacuation', value: 'CMV restrictions during evacuation orders' },
      { label: 'Toll Roads', value: 'SunPass/Toll-by-Plate widely required' },
    ]),
  },
  {
    state: 'Georgia', abbr: 'GA', truckSpeed: '70 mph', dieselTax: '31.7¢/gal',
    categories: w('70 mph', '31.7¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; agricultural vehicles may exceed' },
      { label: 'Truck Restrictions', value: 'Metro Atlanta I-285 peak hour restrictions' },
      { label: 'Ports of Entry', value: 'All CMVs must enter open weigh stations' },
    ]),
  },
  {
    state: 'Hawaii', abbr: 'HI', truckSpeed: '60 mph', dieselTax: '16¢/gal',
    categories: w('60 mph', '16¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; lower on many local roads' },
      { label: 'Island Routes', value: 'Inter-island transport requires barge/air' },
      { label: 'Agriculture', value: 'Strict inspection for invasive species' },
    ]),
  },
  {
    state: 'Idaho', abbr: 'ID', truckSpeed: '70 mph', dieselTax: '32¢/gal',
    categories: w('70 mph', '32¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on mountain passes in winter conditions' },
      { label: 'Weight Limit', value: '80,000 lbs; 105,500 lbs on designated routes' },
      { label: 'Ag Exemption', value: 'Agricultural vehicles have seasonal exemptions' },
      { label: 'Seasonal Limits', value: 'Spring weight restrictions on state roads' },
    ]),
  },
  {
    state: 'Illinois', abbr: 'IL', truckSpeed: '65 mph', dieselTax: '59.6¢/gal',
    categories: w('65 mph', '59.6¢/gal', '13.6 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; Illinois Tollway allows up to 86,000' },
      { label: 'Oversize Hours', value: 'Oversize moves restricted to daylight only' },
      { label: 'Chicago Routes', value: 'Strict truck route ordinances in Chicago' },
      { label: 'Tolls', value: 'I-PASS/E-ZPass required on tollways' },
    ]),
  },
  {
    state: 'Indiana', abbr: 'IN', truckSpeed: '65 mph', dieselTax: '53¢/gal',
    categories: w('65 mph', '53¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; Indiana Toll Road allows 88,000' },
      { label: 'Tolls', value: 'Indiana Toll Road — E-ZPass accepted' },
      { label: 'Oversize Hours', value: 'Restricted on holidays and peak times' },
    ]),
  },
  {
    state: 'Iowa', abbr: 'IA', truckSpeed: '70 mph', dieselTax: '32.5¢/gal',
    categories: w('70 mph', '32.5¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 96,000 lbs with permit on some routes' },
      { label: 'Ag Exemption', value: 'Farm vehicles exempt within 100-mile radius' },
      { label: 'Seasonal Limits', value: 'Spring road restrictions February–May' },
    ]),
  },
  {
    state: 'Kansas', abbr: 'KS', truckSpeed: '70 mph', dieselTax: '26¢/gal',
    categories: w('70 mph', '26¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; agricultural vehicles may exceed' },
      { label: 'Kansas Turnpike', value: 'K-Tag/E-ZPass accepted' },
      { label: 'Wind Restrictions', value: 'High-profile vehicle advisories on I-70' },
    ]),
  },
  {
    state: 'Kentucky', abbr: 'KY', truckSpeed: '65 mph', dieselTax: '21.6¢/gal',
    categories: w('65 mph', '21.6¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; coal trucks have special permits' },
      { label: 'KY Weight Distance Tax', value: 'Required for trucks over 60,000 lbs' },
      { label: 'Mountain Pkwy', value: 'Trucks prohibited on Mountain Parkway' },
    ]),
  },
  {
    state: 'Louisiana', abbr: 'LA', truckSpeed: '70 mph', dieselTax: '20¢/gal',
    categories: w('70 mph', '20¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; up to 100,000 with permit on some roads' },
      { label: 'Bridge Limits', value: 'Many bridges have strict weight limits' },
      { label: 'Hurricane Routes', value: 'CMV restrictions during hurricane evacuations' },
    ]),
  },
  {
    state: 'Maine', abbr: 'ME', truckSpeed: '65 mph', dieselTax: '31.2¢/gal',
    categories: w('65 mph', '31.2¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement but winter tires strongly advised' },
      { label: 'Weight Limit', value: '80,000 lbs; 100,000 lbs on turnpike with permit' },
      { label: 'Spring Restrictions', value: 'Severe spring thaw weight limits — typically Feb–May' },
      { label: 'Maine Turnpike', value: 'E-ZPass accepted' },
    ]),
  },
  {
    state: 'Maryland', abbr: 'MD', truckSpeed: '65 mph', dieselTax: '36.85¢/gal',
    categories: w('65 mph', '36.85¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Bay Bridge', value: 'Trucks may be restricted in high winds' },
      { label: 'Baltimore Tunnel', value: 'Hazmat restrictions in Harbor Tunnel & Fort McHenry Tunnel' },
      { label: 'I-95 Corridor', value: 'Heavy truck traffic — weight enforcement strict' },
    ]),
  },
  {
    state: 'Massachusetts', abbr: 'MA', truckSpeed: '65 mph', dieselTax: '24¢/gal',
    categories: w('65 mph', '24¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; many local roads much lower' },
      { label: 'Turnpike', value: 'E-ZPass required on Mass Pike (I-90)' },
      { label: 'Boston Restrictions', value: 'Strict truck route and time restrictions in Boston' },
      { label: 'Bridge Limits', value: 'Many historic bridges have low weight limits' },
    ]),
  },
  {
    state: 'Michigan', abbr: 'MI', truckSpeed: '65 mph', dieselTax: '26.3¢/gal',
    categories: w('65 mph', '26.3¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: 'Up to 164,000 lbs with LCV permit on designated routes' },
      { label: 'LCV Permits', value: 'Michigan allows Long Combination Vehicles' },
      { label: 'Spring Limits', value: 'Spring weight restrictions statewide' },
      { label: 'Ambassador Bridge', value: 'Strict weight enforcement to Canada' },
    ]),
  },
  {
    state: 'Minnesota', abbr: 'MN', truckSpeed: '70 mph', dieselTax: '28.5¢/gal',
    categories: w('70 mph', '28.5¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement but winter driving rules enforced' },
      { label: 'Weight Limit', value: '80,000 lbs; 88,000 lbs on state routes with permit' },
      { label: 'Spring Restrictions', value: 'March–May weight restrictions on county roads' },
      { label: 'Ag Exemption', value: 'Farm vehicles within 75-mile radius exempt' },
    ]),
  },
  {
    state: 'Mississippi', abbr: 'MS', truckSpeed: '70 mph', dieselTax: '18¢/gal',
    categories: w('70 mph', '18¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; Forestry vehicles may have higher limits' },
      { label: 'Port of Entry', value: 'CMVs must stop at open weigh stations' },
      { label: 'HOS Ag Exemption', value: 'Agricultural operations exempt within 100 air miles' },
    ]),
  },
  {
    state: 'Missouri', abbr: 'MO', truckSpeed: '65 mph', dieselTax: '19.5¢/gal',
    categories: w('65 mph', '19.5¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; some corridors allow 96,000 with permit' },
      { label: 'St. Louis Routes', value: 'Truck restrictions in downtown St. Louis' },
      { label: 'Weigh Stations', value: 'All CMVs over 10,001 lbs must stop' },
    ]),
  },
  {
    state: 'Montana', abbr: 'MT', truckSpeed: '70 mph', dieselTax: '29.44¢/gal',
    categories: w('70 mph', '29.44¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on mountain passes in winter' },
      { label: 'Weight Limit', value: '80,000 lbs; 131,060 lbs with LCV permit' },
      { label: 'LCV Routes', value: 'Montana allows LCVs on designated highways' },
      { label: 'Wildlife Zones', value: 'Reduced speed in designated wildlife crossing areas' },
    ]),
  },
  {
    state: 'Nebraska', abbr: 'NE', truckSpeed: '75 mph', dieselTax: '24.6¢/gal',
    categories: w('75 mph', '24.6¢/gal', '14.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 96,000 lbs on designated highways' },
      { label: 'Wind Restrictions', value: 'High-profile vehicle advisories on I-80' },
      { label: 'Ag Exemption', value: 'Farm vehicles within 75-mile radius exempt' },
    ]),
  },
  {
    state: 'Nevada', abbr: 'NV', truckSpeed: '70 mph', dieselTax: '27.6¢/gal',
    categories: w('70 mph', '27.6¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on I-80 and US-50 mountain areas' },
      { label: 'Weight Limit', value: '80,000 lbs; 129,000 lbs with LCV permit' },
      { label: 'LCV Routes', value: 'Nevada allows LCVs on designated US highways' },
      { label: 'Las Vegas Routes', value: 'Truck restrictions on Las Vegas Strip' },
    ]),
  },
  {
    state: 'New Hampshire', abbr: 'NH', truckSpeed: '65 mph', dieselTax: '22.2¢/gal',
    categories: w('65 mph', '22.2¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; spring thaw restrictions apply' },
      { label: 'Turnpike', value: 'E-ZPass accepted on NH Turnpike' },
      { label: 'Bridge Limits', value: 'Many rural bridges have low posted limits' },
    ]),
  },
  {
    state: 'New Jersey', abbr: 'NJ', truckSpeed: '65 mph', dieselTax: '42.1¢/gal',
    categories: w('65 mph', '42.1¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Turnpike / Parkway', value: 'Trucks restricted to certain lanes' },
      { label: 'Tunnel Restrictions', value: 'Hazmat restrictions in Lincoln and Holland Tunnels' },
      { label: 'NYC Metro', value: 'Many local restrictions — check before entering' },
    ]),
  },
  {
    state: 'New Mexico', abbr: 'NM', truckSpeed: '75 mph', dieselTax: '22.88¢/gal',
    categories: w('75 mph', '22.88¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on I-40 in winter conditions' },
      { label: 'Weight Limit', value: '80,000 lbs; 86,400 lbs on some state roads' },
      { label: 'Ports of Entry', value: 'All CMVs must stop at open POEs' },
      { label: 'Wind Restrictions', value: 'High-profile vehicle warnings on I-40, I-10' },
    ]),
  },
  {
    state: 'New York', abbr: 'NY', truckSpeed: '65 mph', dieselTax: '46.2¢/gal',
    categories: w('65 mph', '46.2¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; NYC bridges may be lower' },
      { label: 'NYC Restrictions', value: 'Strict truck route system — must use designated routes' },
      { label: 'Thruway Tolls', value: 'E-ZPass required on NY State Thruway' },
      { label: 'Tunnel Restrictions', value: 'Hazmat restrictions in Holland/Lincoln Tunnels' },
      { label: 'Manhattan', value: 'Local deliveries must use specific time windows' },
    ]),
  },
  {
    state: 'North Carolina', abbr: 'NC', truckSpeed: '70 mph', dieselTax: '38.9¢/gal',
    categories: w('70 mph', '38.9¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Mountain Roads', value: 'Many roads have truck restrictions/bans' },
      { label: 'Weigh Stations', value: 'All CMVs must stop at open stations' },
    ]),
  },
  {
    state: 'North Dakota', abbr: 'ND', truckSpeed: '75 mph', dieselTax: '23¢/gal',
    categories: w('75 mph', '23¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 105,500 lbs on designated routes' },
      { label: 'Oil Field Routes', value: 'Special permits for Bakken oilfield traffic' },
      { label: 'Spring Limits', value: 'Weight restrictions March–April on county roads' },
    ]),
  },
  {
    state: 'Ohio', abbr: 'OH', truckSpeed: '65 mph', dieselTax: '47¢/gal',
    categories: w('65 mph', '47¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; Ohio Turnpike allows 88,000' },
      { label: 'Ohio Turnpike', value: 'E-ZPass accepted' },
      { label: 'ODOT Permits', value: 'Online oversize/overweight permits available' },
    ]),
  },
  {
    state: 'Oklahoma', abbr: 'OK', truckSpeed: '70 mph', dieselTax: '19¢/gal',
    categories: w('70 mph', '19¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; Turnpike allows 90,000 lbs' },
      { label: 'Oklahoma Turnpike', value: 'PikePass/E-ZPass accepted' },
      { label: 'Wind Restrictions', value: 'High-profile advisories statewide in spring' },
    ]),
  },
  {
    state: 'Oregon', abbr: 'OR', truckSpeed: '65 mph', dieselTax: '35¢/gal',
    categories: w('65 mph', '35¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Traction tires or chains required in mountain passes' },
      { label: 'Weight Limit', value: '80,000 lbs; 105,500 lbs on designated routes' },
      { label: 'Weight Mile Tax', value: 'Oregon charges weight-mile tax instead of fuel tax' },
      { label: 'OReGO', value: 'Mileage-based charge system available' },
      { label: 'LCV Routes', value: 'Oregon allows LCVs on specific US highways' },
    ]),
  },
  {
    state: 'Pennsylvania', abbr: 'PA', truckSpeed: '65 mph', dieselTax: '74.1¢/gal',
    categories: w('65 mph', '74.1¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement but encouraged in mountains' },
      { label: 'Weight Limit', value: '80,000 lbs; PA Turnpike allows 96,000 with permit' },
      { label: 'PA Turnpike', value: 'E-ZPass required — cash lanes eliminated' },
      { label: 'Oversize Permits', value: 'Permits required for moves >8.5 ft wide' },
      { label: 'Pittsburgh Routes', value: 'Truck restrictions in downtown Pittsburgh' },
    ]),
  },
  {
    state: 'Rhode Island', abbr: 'RI', truckSpeed: '65 mph', dieselTax: '34¢/gal',
    categories: w('65 mph', '34¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Providence Routes', value: 'Truck route restrictions in Providence' },
      { label: 'Bridge Limits', value: 'Several bridges with lower weight limits' },
    ]),
  },
  {
    state: 'South Carolina', abbr: 'SC', truckSpeed: '70 mph', dieselTax: '28¢/gal',
    categories: w('70 mph', '28¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Hurricane Routes', value: 'CMV restrictions during evacuations' },
      { label: 'Weigh Stations', value: 'All CMVs must stop at open stations' },
    ]),
  },
  {
    state: 'South Dakota', abbr: 'SD', truckSpeed: '75 mph', dieselTax: '28¢/gal',
    categories: w('75 mph', '28¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 129,000 lbs LCV on designated routes' },
      { label: 'LCV Routes', value: 'SD allows LCVs on interstate and US highways' },
      { label: 'Wind Restrictions', value: 'High-profile advisories on I-90' },
    ]),
  },
  {
    state: 'Tennessee', abbr: 'TN', truckSpeed: '70 mph', dieselTax: '27.4¢/gal',
    categories: w('70 mph', '27.4¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'Nashville Routes', value: 'Truck restrictions in metro Nashville' },
      { label: 'Mountain Roads', value: 'Trucks prohibited on some Smoky Mountain roads' },
      { label: 'Weigh Stations', value: 'All CMVs over 26,000 lbs must stop' },
    ]),
  },
  {
    state: 'Texas', abbr: 'TX', truckSpeed: '70 mph', dieselTax: '20¢/gal',
    categories: w('70 mph', '20¢/gal', '14 ft', [
      { label: 'Night Speed', value: 'Some rural interstates 75 mph day / 65 mph night' },
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 84,000-88,000 lbs on some state roads' },
      { label: 'Oversize Corridors', value: 'Designated OS/OW corridors for heavy haul' },
      { label: 'TxDOT Permits', value: 'Online oversize/overweight permit system' },
      { label: 'Ag Exemption', value: 'Farm vehicles within 150-mile radius exempt' },
    ]),
  },
  {
    state: 'Utah', abbr: 'UT', truckSpeed: '65 mph', dieselTax: '31.9¢/gal',
    categories: w('65 mph', '31.9¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on I-80 and mountain passes in winter' },
      { label: 'Weight Limit', value: '80,000 lbs; 129,000 lbs on designated routes' },
      { label: 'LCV Routes', value: 'Utah allows LCVs on designated routes' },
      { label: 'Canyons', value: 'Many canyon roads ban trucks — check signage' },
    ]),
  },
  {
    state: 'Vermont', abbr: 'VT', truckSpeed: '65 mph', dieselTax: '32¢/gal',
    categories: w('65 mph', '32¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; spring thaw restrictions severe' },
      { label: 'Spring Restrictions', value: 'Class 1–4 weight restrictions Feb–May' },
      { label: 'Covered Bridges', value: 'Many historic covered bridges ban CMVs' },
    ]),
  },
  {
    state: 'Virginia', abbr: 'VA', truckSpeed: '70 mph', dieselTax: '27.6¢/gal',
    categories: w('70 mph', '27.6¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs' },
      { label: 'DC Beltway', value: 'HOV/truck restrictions on I-495 and I-66' },
      { label: 'Chesapeake Bay Bridge-Tunnel', value: 'Hazmat and high-wind restrictions' },
      { label: 'Tolls', value: 'E-ZPass widely used — I-95, I-66, I-495' },
    ]),
  },
  {
    state: 'Washington', abbr: 'WA', truckSpeed: '60 mph', dieselTax: '49.4¢/gal',
    categories: w('60 mph', '49.4¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Traction tires or chains required on mountain passes' },
      { label: 'Weight Limit', value: '80,000 lbs; 105,500 lbs on designated routes' },
      { label: 'LCV Routes', value: 'WA allows LCVs on designated US routes' },
      { label: 'Seattle Routes', value: 'Truck restrictions in downtown Seattle and I-5' },
      { label: 'CARB Equivalent', value: 'WA adopts California diesel emission standards' },
    ]),
  },
  {
    state: 'West Virginia', abbr: 'WV', truckSpeed: '65 mph', dieselTax: '35.7¢/gal',
    categories: w('65 mph', '35.7¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'Required during winter events on I-77, I-64, I-79' },
      { label: 'Weight Limit', value: '80,000 lbs; coal transport permits available' },
      { label: 'WV Turnpike', value: 'E-ZPass accepted on WV Turnpike (I-77/I-64)' },
      { label: 'Mountain Roads', value: 'Many roads have steep grade warnings for trucks' },
    ]),
  },
  {
    state: 'Wisconsin', abbr: 'WI', truckSpeed: '65 mph', dieselTax: '32.9¢/gal',
    categories: w('65 mph', '32.9¢/gal', '13.5 ft', [
      { label: 'Chain Law', value: 'No requirement' },
      { label: 'Weight Limit', value: '80,000 lbs; 96,000-112,000 lbs with permit on some routes' },
      { label: 'Spring Limits', value: 'Weight restrictions March–May on county roads' },
      { label: 'Ag Exemption', value: 'Farm vehicles within 75-mile radius exempt' },
    ]),
  },
  {
    state: 'Wyoming', abbr: 'WY', truckSpeed: '75 mph', dieselTax: '24¢/gal',
    categories: w('75 mph', '24¢/gal', '14 ft', [
      { label: 'Chain Law', value: 'Required on I-80 and mountain corridors in winter' },
      { label: 'Weight Limit', value: '80,000 lbs; 117,000 lbs on designated LCV routes' },
      { label: 'LCV Routes', value: 'Wyoming allows LCVs on interstate and US highways' },
      { label: 'Wind Restrictions', value: 'High-profile vehicle closures on I-80 are common' },
      { label: 'Chain Stations', value: 'Mandatory chain checks during winter events' },
    ]),
  },
];
