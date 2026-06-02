import client from './client';
import { cacheGet, cacheSet, enqueueWrite, CACHE_KEYS } from '../utils/offlineCache';

async function fetchWithCache<T>(cacheKey: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    cacheSet(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
      const cached = await cacheGet<T>(cacheKey);
      if (cached !== null) return cached;
    }
    throw err;
  }
}

// Expenses
export const getExpenses = () => client.get('/expenses').then(r => r.data);
// Receipt photo upload
export const uploadReceipt = (photo: { uri: string; type: string; name: string }) => {
  const form = new FormData();
  form.append('photo', photo as any);
  return client.post('/uploads/receipt', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data as { url: string });
};

export const addExpense = (data: { category: string; amount: number; description?: string; tripId?: string; receiptUrl?: string }) =>
  client.post('/expenses', data).then(r => r.data);
export const updateExpense = (id: string, data: { category: string; amount: number; description?: string; tripId?: string; receiptUrl?: string }) =>
  client.put(`/expenses/${id}`, data).then(r => r.data);
export const deleteExpense = (id: string) => client.delete(`/expenses/${id}`).then(r => r.data);

// IFTA
export const getIFTA = () => client.get('/ifta').then(r => r.data);
export const addIFTAEntry = (data: { state: string; miles: number; gallons: number; taxAmount: number }) =>
  client.post('/ifta', data).then(r => r.data);
export const deleteIFTAEntry = (id: string) => client.delete(`/ifta/${id}`).then(r => r.data);

// Truck Profile (fuel stats + mileage)
export const getTruckProfile = () => client.get('/truck').then(r => r.data);
export const updateTruckProfile = (data: Partial<{
  nickname: string; make: string; truckModel: string; truckYear: number;
  vin: string; plate: string; mcNumber: string; dotNumber: string; insuranceExpiry: string;
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
export const uploadDocument = (name: string, file: { uri: string; type: string; name: string }, expiryDate?: string) => {
  const form = new FormData();
  form.append('file', file as any);
  form.append('name', name);
  if (expiryDate) form.append('expiryDate', expiryDate);
  return client.post('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const addDocument = (data: { name: string; icon?: string; status?: string }) =>
  client.post('/documents', data).then(r => r.data);
export const deleteDocument = (id: string) => client.delete(`/documents/${id}`).then(r => r.data);

// Revenue / P&L
export const getRevenue = (period: 'Week' | 'Month' | 'Quarter' | 'Year') =>
  client.get(`/revenue/${period}`).then(r => r.data);
export const getLiveRevenue = (period: 'Week' | 'Month' | 'Quarter' | 'Year') =>
  client.get(`/revenue/live/${period}`).then(r => r.data);
export const updateRevenue = (period: 'Week' | 'Month' | 'Quarter' | 'Year', data: {
  grossRevenue?: number; netProfit?: number; totalMiles?: number; fuelCost?: number;
  expenses?: { label: string; amount: number; color: string }[]; trend?: number[];
}) => client.put(`/revenue/${period}`, data).then(r => r.data);

// Trip Log
export const getTrips = () => fetchWithCache(CACHE_KEYS.trips, () => client.get('/triplog').then(r => r.data));
export const addTrip = async (data: { date: string; origin: string; destination: string; miles: number; loadNum?: string; rate?: number; broker?: string; notes?: string; status?: string }) => {
  try { return await client.post('/triplog', data).then(r => r.data); }
  catch (err: any) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') { await enqueueWrite({ method: 'POST', url: '/triplog', data }); return null; }
    throw err;
  }
};
export const updateTrip = (id: string, data: object) => client.put(`/triplog/${id}`, data).then(r => r.data);
export const deleteTrip = (id: string) => client.delete(`/triplog/${id}`).then(r => r.data);

// Fuel Log
export const getFuelStops = () => fetchWithCache(CACHE_KEYS.fuelStops, () => client.get('/fuellog').then(r => r.data));
export const addFuelStop = async (data: { date: string; location: string; state: string; gallons: number; pricePerGallon: number; odometer?: number; notes?: string }) => {
  try { return await client.post('/fuellog', data).then(r => r.data); }
  catch (err: any) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') { await enqueueWrite({ method: 'POST', url: '/fuellog', data }); return null; }
    throw err;
  }
};
export const updateFuelStop = (id: string, data: { date: string; location: string; state: string; gallons: number; pricePerGallon: number; odometer?: number; notes?: string }) =>
  client.put(`/fuellog/${id}`, data).then(r => r.data);
export const deleteFuelStop = (id: string) => client.delete(`/fuellog/${id}`).then(r => r.data);

// Broker Notes
export const getBrokerNotes = () => client.get('/brokernotes').then(r => r.data);
export const addBrokerNote = (data: { brokerName: string; mcNum?: string; phone?: string; paySpeed: number; communication: number; loadQuality: number; wouldUseAgain: boolean; notes?: string }) =>
  client.post('/brokernotes', data).then(r => r.data);
export const updateBrokerNote = (id: string, data: object) => client.put(`/brokernotes/${id}`, data).then(r => r.data);
export const deleteBrokerNote = (id: string) => client.delete(`/brokernotes/${id}`).then(r => r.data);

// Emergency Contacts
export const getEmergencyContacts = () => fetchWithCache(CACHE_KEYS.emergencyContacts, () => client.get('/emergency-contacts').then(r => r.data));
export const addEmergencyContact = (data: { name: string; phone: string; relationship?: string }) =>
  client.post('/emergency-contacts', data).then(r => r.data);
export const updateEmergencyContact = (id: string, data: { name: string; phone: string; relationship?: string }) =>
  client.put(`/emergency-contacts/${id}`, data).then(r => r.data);
export const deleteEmergencyContact = (id: string) => client.delete(`/emergency-contacts/${id}`).then(r => r.data);

// HOS
export const getHOSEntries = () => fetchWithCache(CACHE_KEYS.hosEntries, () => client.get('/hos').then(r => r.data));
export const logHOSEntry = async (data: { date: string; drivingHours: number; onDutyHours: number; notes?: string }) => {
  try { return await client.post('/hos', data).then(r => r.data); }
  catch (err: any) {
    if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') { await enqueueWrite({ method: 'POST', url: '/hos', data }); return null; }
    throw err;
  }
};
export const deleteHOSEntry = (id: string) => client.delete(`/hos/${id}`).then(r => r.data);

// Detention
export const getDetentionEvents = () => client.get('/detention').then(r => r.data);
export const startDetention = (data: { location: string; type: string; loadNum?: string; freeHours: number; ratePerHour: number }) =>
  client.post('/detention/start', data).then(r => r.data);
export const stopDetention = (id: string) => client.put(`/detention/${id}/stop`, {}).then(r => r.data);
export const updateDetentionEvent = (id: string, data: { location?: string; type?: string; loadNum?: string; freeHours?: number; ratePerHour?: number }) =>
  client.put(`/detention/${id}`, data).then(r => r.data);
export const deleteDetentionEvent = (id: string) => client.delete(`/detention/${id}`).then(r => r.data);

// Tax Report
export const getTaxReport = (year?: number) =>
  client.get('/revenue/tax/report', { params: year ? { year } : undefined }).then(r => r.data);

// ELD Status
export const getELDEntries = (date?: string) =>
  client.get('/eld', { params: date ? { date } : undefined }).then(r => r.data);
export const startELDStatus = (data: { status: string; location?: string; notes?: string }) =>
  client.post('/eld', data).then(r => r.data);
export const closeELDStatus = () => client.patch('/eld/close', {}).then(r => r.data);
export const syncELDtoHOS = (date?: string) =>
  client.post('/eld/sync-hos', {}, { params: date ? { date } : undefined }).then(r => r.data);
export const deleteELDEntry = (id: string) => client.delete(`/eld/${id}`).then(r => r.data);

// Driver Scorecard
export const getScorecard = (weekOffset = 0) =>
  client.get('/scorecard', { params: { week: weekOffset } }).then(r => r.data);

// Loads
export const getLoads = (status?: string) =>
  client.get('/loads', { params: status ? { status } : undefined }).then(r => r.data);
export const getLoad = (id: string) => client.get(`/loads/${id}`).then(r => r.data);
export const addLoad = (data: object) => client.post('/loads', data).then(r => r.data);
export const updateLoad = (id: string, data: object) => client.put(`/loads/${id}`, data).then(r => r.data);
export const updateLoadStatus = (id: string, status: string) =>
  client.patch(`/loads/${id}/status`, { status }).then(r => r.data);
export const deleteLoad = (id: string) => client.delete(`/loads/${id}`).then(r => r.data);

// Dispatch Contacts
export const getDispatchContacts = () => client.get('/dispatch-contacts').then(r => r.data);
export const addDispatchContact = (data: object) => client.post('/dispatch-contacts', data).then(r => r.data);
export const updateDispatchContact = (id: string, data: object) =>
  client.put(`/dispatch-contacts/${id}`, data).then(r => r.data);
export const toggleContactFavorite = (id: string) =>
  client.patch(`/dispatch-contacts/${id}/favorite`, {}).then(r => r.data);
export const deleteDispatchContact = (id: string) =>
  client.delete(`/dispatch-contacts/${id}`).then(r => r.data);

// Trucker Community Map
export const getMapReports = (lat: number, lng: number, radius = 50, type?: string) =>
  client.get('/map/reports', { params: { lat, lng, radius, ...(type ? { type } : {}) } }).then(r => r.data);
export const getRecentReports = () => client.get('/map/reports/recent').then(r => r.data);
export const createMapReport = (data: {
  type: string; lat: number; lng: number; title: string; description?: string;
  fuelPrice?: number; fuelStation?: string; isOpen?: boolean; waitMinutes?: number;
  rating?: number; amenities?: string[]; hazardType?: string; parkingSpots?: number;
}) => client.post('/map/reports', data).then(r => r.data);
export const upvoteMapReport = (id: string) => client.post(`/map/reports/${id}/upvote`, {}).then(r => r.data);
export const deleteMapReport = (id: string) => client.delete(`/map/reports/${id}`).then(r => r.data);

// DVIR
export const getDVIREntries = () => client.get('/dvir').then(r => r.data);
export const addDVIREntry = (data: {
  type: string; date: string; odometer?: number; truckId?: string;
  items: { label: string; pass: boolean; notes?: string }[];
  driverSignature: string; remarks?: string;
}) => client.post('/dvir', data).then(r => r.data);
export const deleteDVIREntry = (id: string) => client.delete(`/dvir/${id}`).then(r => r.data);

// Invoices
export const getInvoices = () => client.get('/invoices').then(r => r.data);
export const addInvoice = (data: object) => client.post('/invoices', data).then(r => r.data);
export const updateInvoice = (id: string, data: object) => client.put(`/invoices/${id}`, data).then(r => r.data);
export const updateInvoiceStatus = (id: string, status: string) => client.patch(`/invoices/${id}/status`, { status }).then(r => r.data);
export const emailInvoice = (id: string, email?: string) => client.post(`/invoices/${id}/email`, { email }).then(r => r.data);
export const deleteInvoice = (id: string) => client.delete(`/invoices/${id}`).then(r => r.data);

// Drug & Alcohol Tests
export const getDrugTests = () => client.get('/drug-tests').then(r => r.data);
export const addDrugTest = (data: { date: string; testType: string; result: string; testingCompany: string; clearinghouse: boolean; notes?: string }) =>
  client.post('/drug-tests', data).then(r => r.data);
export const updateDrugTest = (id: string, data: object) => client.put(`/drug-tests/${id}`, data).then(r => r.data);
export const deleteDrugTest = (id: string) => client.delete(`/drug-tests/${id}`).then(r => r.data);

// Driver Chat
export const getChatMessages = (channelId: string, after?: string) =>
  client.get(`/chat/${channelId}`, { params: after ? { after } : undefined }).then(r => r.data);
export const sendChatMessage = (channelId: string, message: string) =>
  client.post(`/chat/${channelId}`, { message }).then(r => r.data);
export const deleteChatMessage = (id: string) => client.delete(`/chat/${id}`).then(r => r.data);

// Broker Blacklist
export const getBrokerBlacklist = (search?: string) =>
  client.get('/broker-blacklist', { params: search ? { search } : undefined }).then(r => r.data);
export const addBrokerBlacklist = (data: { brokerName: string; mcNum?: string; phone?: string; reason: string; category: string }) =>
  client.post('/broker-blacklist', data).then(r => r.data);
export const upvoteBrokerBlacklist = (id: string) => client.post(`/broker-blacklist/${id}/upvote`, {}).then(r => r.data);
export const deleteBrokerBlacklist = (id: string) => client.delete(`/broker-blacklist/${id}`).then(r => r.data);

// Owner-Operator Network
export const getNetworkPosts = (category?: string) =>
  client.get('/network', { params: category ? { category } : undefined }).then(r => r.data);
export const getNetworkPost = (id: string) => client.get(`/network/${id}`).then(r => r.data);
export const addNetworkPost = (data: { category: string; title: string; body: string }) =>
  client.post('/network', data).then(r => r.data);
export const upvoteNetworkPost = (id: string) => client.post(`/network/${id}/upvote`, {}).then(r => r.data);
export const replyNetworkPost = (id: string, body: string) => client.post(`/network/${id}/reply`, { body }).then(r => r.data);
export const deleteNetworkPost = (id: string) => client.delete(`/network/${id}`).then(r => r.data);

// Parking Tracker
export const getParkingReservations = () => client.get('/parking').then(r => r.data);
export const addParkingReservation = (data: { location: string; date: string; confirmationNumber: string; arrivalWindow?: string; notes?: string; status?: string }) =>
  client.post('/parking', data).then(r => r.data);
export const updateParkingReservation = (id: string, data: object) => client.put(`/parking/${id}`, data).then(r => r.data);
export const deleteParkingReservation = (id: string) => client.delete(`/parking/${id}`).then(r => r.data);

// Sleep & Fatigue Log
export const getSleepLogs = () => client.get('/sleep-log').then(r => r.data);
export const addSleepLog = (data: { date: string; sleepStart: string; sleepEnd: string; sleepHours: number; quality: number; location?: string; notes?: string }) =>
  client.post('/sleep-log', data).then(r => r.data);
export const deleteSleepLog = (id: string) => client.delete(`/sleep-log/${id}`).then(r => r.data);

// Shipper/Receiver Directory
export const getShippers = (type?: string) =>
  client.get('/shippers', { params: type ? { type } : undefined }).then(r => r.data);
export const addShipper = (data: { name: string; type: string; address: string; city: string; state: string; phone?: string; contact?: string; hours?: string; appointmentRequired?: boolean; dockInfo?: string; notes?: string }) =>
  client.post('/shippers', data).then(r => r.data);
export const updateShipper = (id: string, data: object) => client.put(`/shippers/${id}`, data).then(r => r.data);
export const toggleShipperFavorite = (id: string) => client.patch(`/shippers/${id}/favorite`, {}).then(r => r.data);
export const deleteShipper = (id: string) => client.delete(`/shippers/${id}`).then(r => r.data);

// Referral Program
export const getMyReferral = () => client.get('/referrals/my').then(r => r.data);
export const applyReferralCode = (code: string) => client.post('/referrals/apply', { code }).then(r => r.data);

// CDL / License Tracker
export const getCDLDocs = () => client.get('/cdl-docs').then(r => r.data);
export const addCDLDoc = (data: object) => client.post('/cdl-docs', data).then(r => r.data);
export const updateCDLDoc = (id: string, data: object) => client.put(`/cdl-docs/${id}`, data).then(r => r.data);
export const deleteCDLDoc = (id: string) => client.delete(`/cdl-docs/${id}`).then(r => r.data);

// EIA Diesel Prices (no auth needed — public endpoint)
export const getEIADieselPrices = () => client.get('/fuel/eia-prices').then(r => r.data);

// Cargo Claims
export const getCargoClaims = () => client.get('/cargo-claims').then(r => r.data);
export const addCargoClaim = (data: object) => client.post('/cargo-claims', data).then(r => r.data);
export const updateCargoClaim = (id: string, data: object) => client.put(`/cargo-claims/${id}`, data).then(r => r.data);
export const deleteCargoClaim = (id: string) => client.delete(`/cargo-claims/${id}`).then(r => r.data);
