export interface VirtualLoad {
  id: string;
  commodity: string;
  origin: string;
  destination: string;
  miles: number;
  rate: number; // total rate $
  ratePerMile: number;
  weight: number; // lbs
  pickupWindow: string;
  deliveryWindow: string;
  broker: string;
  brokerRating: number; // 1-5
  difficulty: 'easy' | 'medium' | 'hard';
  notes?: string;
}

export const FREIGHT_LOADS: VirtualLoad[] = [
  {
    id: '1', commodity: 'Refrigerated Produce', origin: 'Fresno, CA', destination: 'Denver, CO',
    miles: 1090, rate: 3270, ratePerMile: 3.0, weight: 42000, pickupWindow: '6 AM – 10 AM', deliveryWindow: '48 hrs',
    broker: 'Western Freight', brokerRating: 4.2, difficulty: 'medium',
    notes: 'Reefer required. Keep temp at 34°F.',
  },
  {
    id: '2', commodity: 'Auto Parts', origin: 'Detroit, MI', destination: 'Louisville, KY',
    miles: 290, rate: 812, ratePerMile: 2.8, weight: 38000, pickupWindow: '8 AM – 12 PM', deliveryWindow: '24 hrs',
    broker: 'Great Lakes Logistics', brokerRating: 3.8, difficulty: 'easy',
  },
  {
    id: '3', commodity: 'Lumber', origin: 'Portland, OR', destination: 'Phoenix, AZ',
    miles: 1320, rate: 2904, ratePerMile: 2.2, weight: 44000, pickupWindow: '7 AM – 9 AM', deliveryWindow: '72 hrs',
    broker: 'Pacific Haulers', brokerRating: 4.5, difficulty: 'medium',
    notes: 'Oversized load. Permit required. Drive at night only.',
  },
  {
    id: '4', commodity: 'Electronics', origin: 'Memphis, TN', destination: 'Atlanta, GA',
    miles: 395, rate: 1580, ratePerMile: 4.0, weight: 25000, pickupWindow: 'ASAP', deliveryWindow: '18 hrs',
    broker: 'FastFreight Inc', brokerRating: 4.7, difficulty: 'easy',
    notes: 'High-value cargo. GPS tracking required. No touch freight.',
  },
  {
    id: '5', commodity: 'Steel Coils', origin: 'Pittsburgh, PA', destination: 'Chicago, IL',
    miles: 460, rate: 1012, ratePerMile: 2.2, weight: 46000, pickupWindow: '5 AM – 7 AM', deliveryWindow: '24 hrs',
    broker: 'Rust Belt Transport', brokerRating: 3.1, difficulty: 'hard',
    notes: 'Tanker endorsement not required but coil racks mandatory. Heavy.',
  },
  {
    id: '6', commodity: 'Dry Goods / Retail', origin: 'Dallas, TX', destination: 'Houston, TX',
    miles: 240, rate: 840, ratePerMile: 3.5, weight: 34000, pickupWindow: '10 AM – 2 PM', deliveryWindow: '12 hrs',
    broker: 'Lone Star Freight', brokerRating: 4.1, difficulty: 'easy',
  },
  {
    id: '7', commodity: 'Hazmat Chemicals', origin: 'Houston, TX', destination: 'New Orleans, LA',
    miles: 350, rate: 1575, ratePerMile: 4.5, weight: 30000, pickupWindow: '6 AM – 8 AM', deliveryWindow: '24 hrs',
    broker: 'Chemical Transport Co', brokerRating: 4.3, difficulty: 'hard',
    notes: 'HazMat endorsement required. Placard class 3. No tunnels.',
  },
  {
    id: '8', commodity: 'Cattle (Live)', origin: 'Amarillo, TX', destination: 'Kansas City, MO',
    miles: 580, rate: 1740, ratePerMile: 3.0, weight: 50000, pickupWindow: 'Early AM only', deliveryWindow: '36 hrs',
    broker: 'Heartland Livestock', brokerRating: 3.9, difficulty: 'medium',
    notes: 'Must minimize stops. Animal welfare rules apply.',
  },
  {
    id: '9', commodity: 'New Vehicles (Auto Hauler)', origin: 'Louisville, KY', destination: 'Columbus, OH',
    miles: 185, rate: 925, ratePerMile: 5.0, weight: 55000, pickupWindow: '8 AM – 11 AM', deliveryWindow: '24 hrs',
    broker: 'AutoMove Direct', brokerRating: 4.6, difficulty: 'medium',
    notes: 'Auto hauler required. 9-car load. Pre/post inspection at each stop.',
  },
  {
    id: '10', commodity: 'Building Materials', origin: 'Phoenix, AZ', destination: 'Las Vegas, NV',
    miles: 300, rate: 750, ratePerMile: 2.5, weight: 40000, pickupWindow: 'Flexible', deliveryWindow: '24 hrs',
    broker: 'Desert Builders Supply', brokerRating: 3.5, difficulty: 'easy',
  },
  {
    id: '11', commodity: 'Frozen Goods', origin: 'Minneapolis, MN', destination: 'St. Louis, MO',
    miles: 570, rate: 2052, ratePerMile: 3.6, weight: 38000, pickupWindow: '4 AM – 6 AM', deliveryWindow: '30 hrs',
    broker: 'North Star Reefer', brokerRating: 4.0, difficulty: 'medium',
    notes: 'Reefer required. Keep at -10°F. Drop trailer at facility.',
  },
  {
    id: '12', commodity: 'Flatbed Steel', origin: 'Birmingham, AL', destination: 'Nashville, TN',
    miles: 185, rate: 555, ratePerMile: 3.0, weight: 42000, pickupWindow: '7 AM – 9 AM', deliveryWindow: '12 hrs',
    broker: 'Southern Steel Haulers', brokerRating: 3.7, difficulty: 'medium',
    notes: 'Flatbed required. Tarping required. Lumber rack needed.',
  },
];

export const BUSINESS_EXPENSES = {
  fuelCostPerMile: 0.55,       // avg fuel cost per mile
  maintenanceCostPerMile: 0.12, // tires, oil, misc
  insurancePerMonth: 1200,
  truckPaymentPerMonth: 2800,   // avg O/O truck payment
  miscPerMonth: 400,            // licenses, permits, phone, etc.
};
