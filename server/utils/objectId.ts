import mongoose from 'mongoose';

export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

export function userIdFilter(userId: string): { userId: mongoose.Types.ObjectId } {
  return { userId: toObjectId(userId) };
}
