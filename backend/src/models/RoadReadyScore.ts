import mongoose, { Document, Schema } from 'mongoose';

export interface IRoadReadyScore extends Document {
  userId: mongoose.Types.ObjectId;
  // Component scores
  safetyScore: number;       // 0-300
  skillScore: number;        // 0-200
  complianceScore: number;   // 0-200
  businessScore: number;     // 0-150
  reputationScore: number;   // 0-100
  educationScore: number;    // 0-50
  totalScore: number;        // 0-1000
  // Progress tracking
  lessonsCompleted: string[];
  challengesBestScores: Record<string, number>;
  freightCareerStats: {
    loadsCompleted: number;
    totalMiles: number;
    grossRevenue: number;
    netProfit: number;
    onTimeRate: number;
    avgRatePerMile: number;
  };
  ooStats: {
    weekNumber: number;
    cashBalance: number;
    truckValue: number;
    totalProfitAllTime: number;
    breakdownsTotal: number;
    loansOutstanding: number;
  };
  badges: string[];
  updatedAt: Date;
}

const RoadReadyScoreSchema = new Schema<IRoadReadyScore>(
  {
    userId:          { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    safetyScore:     { type: Number, default: 0 },
    skillScore:      { type: Number, default: 0 },
    complianceScore: { type: Number, default: 0 },
    businessScore:   { type: Number, default: 0 },
    reputationScore: { type: Number, default: 0 },
    educationScore:  { type: Number, default: 0 },
    totalScore:      { type: Number, default: 0 },
    lessonsCompleted:       { type: [String], default: [] },
    challengesBestScores:   { type: Schema.Types.Mixed, default: {} },
    freightCareerStats: {
      loadsCompleted: { type: Number, default: 0 },
      totalMiles:     { type: Number, default: 0 },
      grossRevenue:   { type: Number, default: 0 },
      netProfit:      { type: Number, default: 0 },
      onTimeRate:     { type: Number, default: 100 },
      avgRatePerMile: { type: Number, default: 0 },
    },
    ooStats: {
      weekNumber:          { type: Number, default: 1 },
      cashBalance:         { type: Number, default: 50000 },
      truckValue:          { type: Number, default: 0 },
      totalProfitAllTime:  { type: Number, default: 0 },
      breakdownsTotal:     { type: Number, default: 0 },
      loansOutstanding:    { type: Number, default: 0 },
    },
    badges: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IRoadReadyScore>('RoadReadyScore', RoadReadyScoreSchema);
