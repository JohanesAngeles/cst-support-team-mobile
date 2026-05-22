import client from './client';

// Expenses
export const getExpenses = () => client.get('/expenses').then(r => r.data);
export const addExpense = (data: { category: string; amount: number; description?: string }) =>
  client.post('/expenses', data).then(r => r.data);
export const deleteExpense = (id: string) => client.delete(`/expenses/${id}`).then(r => r.data);

// IFTA
export const getIFTA = () => client.get('/ifta').then(r => r.data);
export const addIFTAEntry = (data: { state: string; miles: number; gallons: number; taxAmount: number }) =>
  client.post('/ifta', data).then(r => r.data);
export const deleteIFTAEntry = (id: string) => client.delete(`/ifta/${id}`).then(r => r.data);

// Truck Profile (fuel stats + mileage)
export const getTruckProfile = () => client.get('/truck').then(r => r.data);
export const updateTruckProfile = (data: Partial<{
  currentMileage: number; mpg: number; cheapestFuelPrice: number;
  idleHours: number; fuelCardConnected: boolean;
}>) => client.put('/truck', data).then(r => r.data);

// Maintenance
export const getMaintenance = () => client.get('/maintenance').then(r => r.data);
export const addMaintenanceRecord = (data: {
  name: string; icon?: string; lastDate?: string;
  nextDate: string; lastMiles?: number; intervalMiles?: number;
}) => client.post('/maintenance', data).then(r => r.data);
export const completeMaintenance = (id: string) =>
  client.put(`/maintenance/${id}/complete`, {}).then(r => r.data);
export const deleteMaintenanceRecord = (id: string) =>
  client.delete(`/maintenance/${id}`).then(r => r.data);

// Deadlines
export const getDeadlines = () => client.get('/deadlines').then(r => r.data);
export const addDeadline = (data: { type: string; title: string; date: string; notes?: string }) =>
  client.post('/deadlines', data).then(r => r.data);
export const deleteDeadline = (id: string) => client.delete(`/deadlines/${id}`).then(r => r.data);

// Documents
export const getDocuments = () => client.get('/documents').then(r => r.data);
export const addDocument = (data: { name: string; icon?: string; status?: string }) =>
  client.post('/documents', data).then(r => r.data);
export const deleteDocument = (id: string) => client.delete(`/documents/${id}`).then(r => r.data);

// Revenue / P&L
export const getRevenue = (period: 'Week' | 'Month' | 'Quarter' | 'Year') =>
  client.get(`/revenue/${period}`).then(r => r.data);
export const updateRevenue = (period: 'Week' | 'Month' | 'Quarter' | 'Year', data: {
  grossRevenue?: number; netProfit?: number; totalMiles?: number; fuelCost?: number;
  expenses?: { label: string; amount: number; color: string }[]; trend?: number[];
}) => client.put(`/revenue/${period}`, data).then(r => r.data);

// Trip Log
export const getTrips = () => client.get('/triplog').then(r => r.data);
export const addTrip = (data: { date: string; origin: string; destination: string; miles: number; loadNum?: string; rate?: number; broker?: string; notes?: string; status?: string }) =>
  client.post('/triplog', data).then(r => r.data);
export const updateTrip = (id: string, data: object) => client.put(`/triplog/${id}`, data).then(r => r.data);
export const deleteTrip = (id: string) => client.delete(`/triplog/${id}`).then(r => r.data);

// Fuel Log
export const getFuelStops = () => client.get('/fuellog').then(r => r.data);
export const addFuelStop = (data: { date: string; location: string; state: string; gallons: number; pricePerGallon: number; odometer?: number; notes?: string }) =>
  client.post('/fuellog', data).then(r => r.data);
export const deleteFuelStop = (id: string) => client.delete(`/fuellog/${id}`).then(r => r.data);

// Broker Notes
export const getBrokerNotes = () => client.get('/brokernotes').then(r => r.data);
export const addBrokerNote = (data: { brokerName: string; mcNum?: string; phone?: string; paySpeed: number; communication: number; loadQuality: number; wouldUseAgain: boolean; notes?: string }) =>
  client.post('/brokernotes', data).then(r => r.data);
export const updateBrokerNote = (id: string, data: object) => client.put(`/brokernotes/${id}`, data).then(r => r.data);
export const deleteBrokerNote = (id: string) => client.delete(`/brokernotes/${id}`).then(r => r.data);

// HOS
export const getHOSEntries = () => client.get('/hos').then(r => r.data);
export const logHOSEntry = (data: { date: string; drivingHours: number; onDutyHours: number; notes?: string }) =>
  client.post('/hos', data).then(r => r.data);
export const deleteHOSEntry = (id: string) => client.delete(`/hos/${id}`).then(r => r.data);

// Detention
export const getDetentionEvents = () => client.get('/detention').then(r => r.data);
export const startDetention = (data: { location: string; type: string; loadNum?: string; freeHours: number; ratePerHour: number }) =>
  client.post('/detention/start', data).then(r => r.data);
export const stopDetention = (id: string) => client.put(`/detention/${id}/stop`, {}).then(r => r.data);
export const deleteDetentionEvent = (id: string) => client.delete(`/detention/${id}`).then(r => r.data);
