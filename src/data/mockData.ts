import type { Booking, Profile, Room } from '../types/booking';

export const profiles: Profile[] = [
  {
    id: 'profile-ramadan',
    email: 'ramadan@example.com',
    displayName: 'Ramadan',
    role: 'admin',
  },
  {
    id: 'profile-amina',
    email: 'amina@example.com',
    displayName: 'Amina',
    role: 'member',
  },
];

export const rooms: Room[] = [
  { id: 'room-1', name: 'Rum 1', isActive: true },
  { id: 'room-2', name: 'Rum 2', isActive: true },
  { id: 'room-3', name: 'Rum 3', isActive: true },
  { id: 'room-4', name: 'Rum 4', isActive: false },
];

export const bookings: Booking[] = [
  {
    id: 'booking-1',
    userId: 'profile-ramadan',
    roomIds: ['room-1', 'room-2'],
    startDate: '2026-07-12',
    endDate: '2026-07-16',
    status: 'confirmed',
  },
  {
    id: 'booking-2',
    userId: 'profile-amina',
    roomIds: ['room-3'],
    startDate: '2026-07-14',
    endDate: '2026-07-18',
    status: 'confirmed',
  },
  {
    id: 'booking-3',
    userId: 'profile-amina',
    roomIds: ['room-2'],
    startDate: '2026-08-01',
    endDate: '2026-08-04',
    status: 'cancelled',
  },
];
