import mongoose, { Document, Schema } from 'mongoose';

export type BlockType = 'block' | 'mute';

export interface IBlock extends Document {
  actorId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  type: BlockType;
  createdAt: Date;
}

const BlockSchema = new Schema<IBlock>(
  {
    actorId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['block', 'mute'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// One relationship (block OR mute) per actor/target pair
BlockSchema.index({ actorId: 1, targetId: 1 }, { unique: true });
BlockSchema.index({ targetId: 1 });

export default mongoose.model<IBlock>('Block', BlockSchema);
