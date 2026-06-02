export interface CDLQuestion {
  q: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
}

export interface CDLLesson {
  id: string;
  title: string;
  icon: string;
  color: string;
  questions: CDLQuestion[];
}

export const CDL_LESSONS: CDLLesson[] = [
  {
    id: 'general',
    title: 'General Knowledge',
    icon: 'book-outline',
    color: '#3498DB',
    questions: [
      {
        q: 'What is the minimum tread depth required for front tires on a commercial vehicle?',
        options: ['2/32 inch', '4/32 inch', '6/32 inch', '8/32 inch'],
        answer: 1,
        explanation: '4/32 inch is the minimum for front tires. Rear tires require 2/32 inch minimum.',
      },
      {
        q: 'How many hours of rest are required before a property-carrying driver can start a new 11-hour drive period?',
        options: ['8 hours', '10 hours', '11 hours', '14 hours'],
        answer: 1,
        explanation: 'FMCSA requires 10 consecutive hours off-duty before starting a new driving period.',
      },
      {
        q: 'What is the maximum weight allowed on a single axle?',
        options: ['17,000 lbs', '20,000 lbs', '22,500 lbs', '25,000 lbs'],
        answer: 1,
        explanation: 'Federal law limits single axles to 20,000 lbs. Tandem axles are limited to 34,000 lbs.',
      },
      {
        q: 'When should you downshift on a steep downgrade?',
        options: ['After you start going down', 'At the bottom of the grade', 'Before you start going down', 'When brakes get hot'],
        answer: 2,
        explanation: 'Always select your proper gear BEFORE starting a downgrade — not after. Engine braking prevents brake fade.',
      },
      {
        q: 'What does a yellow diamond-shaped sign mean?',
        options: ['Stop ahead', 'Warning', 'Construction zone', 'Speed limit'],
        answer: 1,
        explanation: 'Yellow diamond-shaped signs are warning signs — they alert drivers to hazards ahead.',
      },
      {
        q: 'How far must you park from a fire hydrant?',
        options: ['5 feet', '10 feet', '15 feet', '20 feet'],
        answer: 2,
        explanation: 'You must not park within 15 feet of a fire hydrant.',
      },
      {
        q: 'Which of these is NOT a proper way to check tire inflation?',
        options: ['Use a tire gauge', 'Thump the tire with a mallet', 'Visually inspect for bulges', 'Check pressure when tires are cold'],
        answer: 1,
        explanation: 'Thumping a tire with a mallet is NOT an accurate way to check inflation. Always use a proper gauge.',
      },
      {
        q: 'What is the minimum following distance for a truck traveling at 55 mph in good conditions?',
        options: ['3 seconds', '4 seconds', '5 seconds', '7 seconds'],
        answer: 3,
        explanation: 'For trucks over 40 feet, use 7 seconds at 55 mph. Add 1 second for every 10 mph over 40.',
      },
      {
        q: 'When driving at night, you should be able to stop within:',
        options: ['Your visibility range', 'Half your visibility range', 'The length of your trailer', '500 feet'],
        answer: 0,
        explanation: 'Always drive within your visibility range — if you can only see 400 feet, be able to stop in 400 feet.',
      },
      {
        q: 'What is a "hazmat" placard required for?',
        options: ['All commercial loads', 'Loads over 10,000 lbs', 'Hazardous materials above threshold quantities', 'Any load crossing state lines'],
        answer: 2,
        explanation: 'Placards are required when transporting hazardous materials in quantities at or above defined thresholds.',
      },
    ],
  },
  {
    id: 'air-brakes',
    title: 'Air Brakes',
    icon: 'speedometer-outline',
    color: '#E74C3C',
    questions: [
      {
        q: 'At what PSI should the low air pressure warning activate?',
        options: ['40 PSI', '55 PSI', '60 PSI', '90 PSI'],
        answer: 1,
        explanation: 'The low air pressure warning must activate before air pressure drops below 60 PSI.',
      },
      {
        q: 'What is the normal operating air pressure range for air brakes?',
        options: ['60–80 PSI', '90–100 PSI', '100–125 PSI', '130–150 PSI'],
        answer: 2,
        explanation: 'Normal operating air pressure is 100–125 PSI. Below 60 PSI, spring brakes may engage.',
      },
      {
        q: 'During a static air leakage test, what is the maximum allowable drop in 1 minute for a combination vehicle?',
        options: ['1 PSI', '2 PSI', '3 PSI', '4 PSI'],
        answer: 2,
        explanation: 'A combination vehicle (tractor + trailer) should not lose more than 3 PSI per minute.',
      },
      {
        q: 'What do spring brakes do when air pressure drops below about 20–45 PSI?',
        options: ['Release automatically', 'Apply automatically', 'Sound an alarm only', 'Have no effect'],
        answer: 1,
        explanation: 'Spring brakes automatically apply when air pressure drops too low — this is a safety feature.',
      },
      {
        q: 'What is brake fade?',
        options: ['Brakes getting stronger over time', 'Loss of braking power from heat buildup', 'Brakes that squeak', 'Air pressure dropping slowly'],
        answer: 1,
        explanation: 'Brake fade is the loss of braking power caused by overheated brakes — a danger on long downgrades.',
      },
      {
        q: 'To test air brake adjustment, apply the brakes at 90 PSI from a stopped position. Parking brakes should hold at:',
        options: ['Any speed', 'Under 20 mph only', 'While stationary', 'All speeds up to 55 mph'],
        answer: 2,
        explanation: 'Parking/emergency brakes must hold the vehicle stationary when tested.',
      },
      {
        q: 'What is the purpose of the dual air brake system?',
        options: ['Faster air buildup', 'Braking for front and rear separately', 'Separate systems for safety if one fails', 'Louder warning sounds'],
        answer: 2,
        explanation: 'The dual system has two separate circuits — if one fails, the other can still stop the vehicle.',
      },
      {
        q: 'What is the correct order to release spring brakes?',
        options: ['Build air to 60 PSI then pull the knob', 'Push the parking brake button in', 'Build air above 60 PSI, then push parking brake button', 'Pull the trailer air supply valve first'],
        answer: 2,
        explanation: 'Air must be built above 60 PSI before spring brakes can be released using the parking brake control.',
      },
    ],
  },
  {
    id: 'vehicle-inspection',
    title: 'Vehicle Inspection',
    icon: 'search-outline',
    color: '#2ECC71',
    questions: [
      {
        q: 'During a pre-trip inspection, what should you check the engine oil level against?',
        options: ['Dipstick markings', 'The manufacturer spec plate', 'The oil cap max line only', 'Your trip log from yesterday'],
        answer: 0,
        explanation: 'Check engine oil using the dipstick — it should be at or near the full mark.',
      },
      {
        q: 'What are the 7 steps of a pre-trip inspection?',
        options: [
          'Approach, engine compartment, in-cab, lights, walkaround, signal lights, brake test',
          'Walk around, check tires, check mirrors, start engine, test brakes, check lights, load',
          'Fuel check, oil check, tire check, mirror check, horn, wipers, brakes',
          'License check, logbook, DOT number, insurance, cargo, load, GPS',
        ],
        answer: 0,
        explanation: 'The 7-step inspection: approach vehicle, engine compartment, inside cab, turn on lights, walkaround, turn off lights/check signals, brake check.',
      },
      {
        q: 'During a brake check, you should hear:',
        options: ['Nothing at all', 'Air escaping from all connections', 'No major air leaks from brake system', 'A clicking sound from drums'],
        answer: 2,
        explanation: 'Some air escaping is normal, but large leaks indicate a problem that must be fixed before driving.',
      },
      {
        q: 'What should the water temperature gauge read during normal operations?',
        options: ['In the cold zone', 'In the normal range', 'Near the red zone', 'It does not matter'],
        answer: 1,
        explanation: 'Water temperature should be in the normal operating range — too cold or too hot indicates a problem.',
      },
      {
        q: 'During a pre-trip, you discover a crack in your windshield affecting your line of sight. You should:',
        options: ['Drive carefully at reduced speed', 'Tape the crack and continue', 'Not drive until the windshield is replaced', 'Only drive during daylight hours'],
        answer: 2,
        explanation: 'A cracked windshield that impairs the driver\'s view is an out-of-service defect — the vehicle must not be driven.',
      },
      {
        q: 'Lug nuts on wheels should be:',
        options: ['Hand-tight only', 'Tight with no signs of looseness or rust streaks', 'Replaced every trip', 'Checked only monthly'],
        answer: 1,
        explanation: 'Lug nuts must be tight with no rust streaks (which indicate movement/looseness). Missing or cracked lug nuts are out-of-service conditions.',
      },
      {
        q: 'What is the minimum oil pressure a truck should show during normal operation?',
        options: ['It depends on the manufacturer specs', 'Always above 100 PSI', 'Always in the normal range on the gauge', 'At least 40 PSI at all times'],
        answer: 2,
        explanation: 'Oil pressure should be in the normal range for your vehicle. Consult the manufacturer specs — but any time the gauge reads low, stop and investigate.',
      },
    ],
  },
  {
    id: 'hos',
    title: 'Hours of Service',
    icon: 'time-outline',
    color: '#F39C12',
    questions: [
      {
        q: 'What is the maximum number of consecutive hours a property driver can drive?',
        options: ['8 hours', '10 hours', '11 hours', '14 hours'],
        answer: 2,
        explanation: 'Property-carrying drivers may drive a maximum of 11 hours after 10 consecutive hours off duty.',
      },
      {
        q: 'What is the 14-hour rule?',
        options: [
          'You must stop after 14 hours of driving',
          'You cannot drive after 14 hours on-duty from when you came on duty',
          'You must take a 14-hour rest break',
          'You can work 14 hours per day total',
        ],
        answer: 1,
        explanation: 'The 14-hour window starts when you come on duty. You cannot drive after 14 consecutive hours, even if you haven\'t used your 11 driving hours.',
      },
      {
        q: 'When is a 30-minute break required?',
        options: [
          'Every 4 hours',
          'After 8 hours of on-duty time',
          'After 8 hours of driving without a 30-minute break',
          'Before any drive over 200 miles',
        ],
        answer: 2,
        explanation: 'Drivers must take a 30-minute break after 8 consecutive hours of driving — it can be off-duty or sleeper berth time.',
      },
      {
        q: 'What is the 70-hour/8-day rule?',
        options: [
          'Maximum 70 hours driving per week',
          'Maximum 70 hours on-duty in any 8 consecutive days',
          'Must rest 8 days after 70 hours driving',
          '70 mph maximum for 8 hours',
        ],
        answer: 1,
        explanation: 'You cannot be on-duty more than 70 hours in any 8 consecutive days. The 60/7-day rule applies to carriers not operating every day.',
      },
      {
        q: 'What does a 34-hour restart do?',
        options: [
          'Resets your 11-hour drive clock',
          'Resets your 14-hour window',
          'Resets your 70/60-hour cycle',
          'Resets your log book',
        ],
        answer: 2,
        explanation: 'A 34-hour restart resets your 70 or 60 hour clock after taking 34 consecutive hours off duty.',
      },
      {
        q: 'Short-haul exemption from keeping a log book applies to drivers who:',
        options: [
          'Drive under 150 miles from their home terminal',
          'Drive under 250 miles and return same day',
          'Report to the same home terminal, stay within 150 air miles, and return within 14 hours',
          'Drive under 100 miles in good weather only',
        ],
        answer: 2,
        explanation: 'Short-haul exemption requires: same home terminal, within 150 air miles, return within 14 hours, at least 10 consecutive hours off.',
      },
    ],
  },
  {
    id: 'cargo',
    title: 'Cargo Securement',
    icon: 'cube-outline',
    color: '#9B59B6',
    questions: [
      {
        q: 'What is the minimum number of tie-downs required for cargo up to 5 feet long?',
        options: ['1', '2', '3', '4'],
        answer: 1,
        explanation: 'Cargo up to 5 feet long and up to 1,100 lbs requires a minimum of 2 tie-downs.',
      },
      {
        q: 'Cargo must be secured well enough to prevent it from shifting or falling. The minimum forward restraint force must be:',
        options: ['25% of cargo weight', '50% of cargo weight', 'Equal to cargo weight', 'Twice the cargo weight'],
        answer: 2,
        explanation: 'Tie-downs must provide restraint equal to the cargo weight in the forward direction (100% of cargo weight).',
      },
      {
        q: 'When should you check your cargo during a trip?',
        options: [
          'Only at pickup and delivery',
          'Within the first 50 miles, and every 3 hours or 150 miles after',
          'Only if you hear something shifting',
          'Every hour',
        ],
        answer: 1,
        explanation: 'Check cargo within first 50 miles, then every 3 hours OR 150 miles — whichever comes first.',
      },
      {
        q: 'What is "blocking" in cargo securement?',
        options: [
          'Preventing other drivers from passing',
          'Wood or metal pieces used to prevent cargo from moving',
          'Blocking sunlight from the load',
          'A loading dock procedure',
        ],
        answer: 1,
        explanation: 'Blocking is placing wood, metal, or other material against cargo to prevent it from moving.',
      },
      {
        q: 'What is the minimum working load limit (WLL) for tie-downs?',
        options: [
          '10% of cargo weight',
          '25% of cargo weight per tie-down',
          '50% of cargo weight',
          '100% of cargo weight total',
        ],
        answer: 1,
        explanation: 'Each tie-down must have a WLL of at least 25% of the cargo\'s weight, and together must equal at least 50% of cargo weight.',
      },
      {
        q: 'Liquid tankers are at greatest risk of rollover when:',
        options: ['Fully loaded', 'Half full or partially filled', 'Empty', 'At maximum legal weight'],
        answer: 1,
        explanation: 'Partially filled tanks create liquid surge — liquid shifts and can cause dangerous vehicle instability on curves.',
      },
    ],
  },
];

export const SKILL_CHALLENGES = [
  {
    id: 'pretrip-speed',
    title: 'Pre-Trip Speed Run',
    icon: 'clipboard-outline',
    color: '#2ECC71',
    desc: 'Tap all defects in the correct inspection order — as fast as you can',
    timeLimit: 60,
  },
  {
    id: 'hos-math',
    title: 'HOS Quick Math',
    icon: 'calculator-outline',
    color: '#3498DB',
    desc: 'Calculate remaining drive hours before the clock runs out',
    timeLimit: 45,
  },
  {
    id: 'axle-weight',
    title: 'Axle Weight Challenge',
    icon: 'scale-outline',
    color: '#E67E22',
    desc: 'Identify overweight axle configurations quickly',
    timeLimit: 50,
  },
  {
    id: 'road-signs',
    title: 'Road Sign Blitz',
    icon: 'warning-outline',
    color: '#E74C3C',
    desc: 'Identify road signs before the timer runs out',
    timeLimit: 40,
  },
];

export const HOS_MATH_PROBLEMS = [
  { q: 'You came on duty at 6:00 AM. It is now 2:00 PM. You have driven 7 hours. How many driving hours remain?', answer: 4, hint: '11 - 7 = 4 driving hours left' },
  { q: 'You have been on duty for 12 hours. How many hours remain in your 14-hour window?', answer: 2, hint: '14 - 12 = 2 hours remain' },
  { q: 'You have driven 9.5 hours today. How many more driving hours are you allowed?', answer: 1.5, hint: '11 - 9.5 = 1.5 hours' },
  { q: 'Your 14-hour window started at 4:00 AM. At what time does your 14-hour window close?', answer: 18, hint: '4 AM + 14 = 6:00 PM (18:00)' },
  { q: 'You have 68 hours used in your 8-day cycle. How many hours remain before reset?', answer: 2, hint: '70 - 68 = 2 hours' },
  { q: 'You drove 3 hours, took a 30-min break, then drove 5 more hours. How many driving hours remain?', answer: 3, hint: '11 - 8 = 3 hours remain' },
];

export const AXLE_PROBLEMS = [
  { q: 'Steer: 12,000 lbs | Drive: 36,000 lbs | Trailer: 20,000 lbs\nWhich axle(s) are overweight?', answer: 'Drive axle (34,000 lb limit)', options: ['Steer axle', 'Drive axle', 'Trailer axle', 'None — all legal'] },
  { q: 'Steer: 10,000 lbs | Drive: 34,000 lbs | Trailer: 34,000 lbs\nTotal gross weight?', answer: '78,000 lbs — LEGAL', options: ['78,000 lbs — LEGAL', '78,000 lbs — OVERWEIGHT', '80,000 lbs — LEGAL', '76,000 lbs — LEGAL'] },
  { q: 'Single rear axle: 22,000 lbs. Is this legal?', answer: 'NO — exceeds 20,000 lb single axle limit', options: ['YES — single axles allow 22,000', 'NO — exceeds 20,000 lb single axle limit', 'YES — only tandem limits apply', 'NO — single axle limit is 18,000'] },
  { q: 'Steer: 11,000 | Drive tandem: 34,000 | Trailer tandem: 34,000. Gross weight?', answer: '79,000 — LEGAL (under 80,000)', options: ['79,000 — LEGAL (under 80,000)', '79,000 — OVERWEIGHT', '80,000 — exactly at limit', '81,000 — OVERWEIGHT'] },
];

export const ROAD_SIGN_QUESTIONS: CDLQuestion[] = [
  { q: 'A red octagon sign means:', options: ['Yield', 'Stop', 'Do Not Enter', 'Wrong Way'], answer: 1, explanation: 'Red octagons are always STOP signs.' },
  { q: 'A downward-pointing triangle means:', options: ['Stop ahead', 'Yield', 'Railroad crossing', 'No entry'], answer: 1, explanation: 'Downward triangles mean YIELD — slow down and give way.' },
  { q: 'An orange diamond shape in a construction zone means:', options: ['Speed limit', 'Warning — work zone', 'Detour', 'Flagman ahead'], answer: 1, explanation: 'Orange diamond signs warn of construction/work zone hazards.' },
  { q: 'A white rectangular sign with black text is typically a:', options: ['Warning sign', 'Regulatory sign', 'Guide sign', 'Temporary sign'], answer: 1, explanation: 'White rectangular signs are regulatory — they state laws (speed limits, turn restrictions, etc.).' },
  { q: 'A green rectangular sign provides:', options: ['Warnings', 'Regulations', 'Guide/directional info', 'Construction info'], answer: 2, explanation: 'Green signs give guide information: distances, destinations, highway numbers.' },
  { q: 'A circular sign with an X and "RR" means:', options: ['Railroad crossing ahead', 'Road restricted', 'Reduce speed and stop', 'Right of way to trains'], answer: 0, explanation: 'Circular signs with RR warn of railroad crossings ahead.' },
];
