export type UserRole = 'admin' | 'member';

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export type AllowedEmail = {
  email: string;
  createdAt: string;
};

export type Room = {
  id: string;
  name: string;
  isActive: boolean;
};

export type BookingStatus = 'confirmed' | 'cancelled';

export type Booking = {
  id: string;
  userId: string;
  roomIds: string[];
  startDate: string;
  endDate: string;
  status: BookingStatus;
};

export type BookingWithDetails = Booking & {
  user: Profile;
  rooms: Room[];
};
