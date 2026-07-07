import mongoose, { Document, Schema } from 'mongoose';

export type ReportTargetType = 'post' | 'user';
export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

export interface IReport extends Document {
  reporterId: mongoose.Types.ObjectId;
  reporterName: string;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  targetLabel: string;
  targetDetail?: string;
  reason: string;
  status: ReportStatus;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reporterName: { type: String, required: true },
    targetType:   { type: String, enum: ['post', 'user'], required: true },
    targetId:     { type: Schema.Types.ObjectId, required: true },
    targetLabel:  { type: String, required: true },
    targetDetail: { type: String, maxlength: 300 },
    reason:       { type: String, required: true, maxlength: 500 },
    status:       { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
    resolvedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt:   { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IReport>('Report', ReportSchema);
