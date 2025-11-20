import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Plus, Calendar, DollarSign, Users, Clock } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, addDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

type House = {
  id: string;
  name: string;
  type: 'house';
  status: 'available' | 'booked';
};

type HouseBooking = {
  id: string;
  houseId: string;
  houseName: string;
  guestName: string;
  phoneNumber: string;
  idNumber: string;
  numberOfGuests: number;
  daysOfStay: number;
  rent: number;
  initialPayment: number;
  paymentMode: 'cash' | 'gpay';
  checkedInAt: any;
  checkOutDate: any;
  isCheckedOut: boolean;
  pendingAmount: number;
  extraFees: Array<{
    description: string;
    amount: number;
    timestamp: any;
  }>;
  extensions: Array<{
    additionalDays: number;
    rentForDays: number;
    timestamp: any;
  }>;
};

const HOUSES = [
  { id: 'white-house-ground', name: 'White House - Ground Floor', type: 'house' as const },
  { id: 'white-house-first', name: 'White House - First Floor', type: 'house' as const },
  { id: 'white-house-second', name: 'White House - Second Floor', type: 'house' as const },
  { id: 'guest-house', name: 'Guest House', type: 'house' as const },
];

const HousePage = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<HouseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInModal, setCheckInModal] = useState(false);
  const [extendModal, setExtendModal] = useState(false);
  const [extraFeeModal, setExtraFeeModal] = useState(false);
  const [selectedHouse, setSelectedHouse] = useState<typeof HOUSES[0] | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<HouseBooking | null>(null);

  const [checkInForm, setCheckInForm] = useState({
    guestName: '',
    phoneNumber: '',
    idNumber: '',
    numberOfGuests: 1,
    stayType: 'days' as 'month' | 'days',
    daysOfStay: 1,
    rent: '',
    initialPayment: '',
    paymentMode: 'cash' as 'cash' | 'gpay'
  });

  const [extendForm, setExtendForm] = useState({
    additionalDays: 1,
    rentForDays: ''
  });

  const [extraFeeForm, setExtraFeeForm] = useState({
    description: '',
    amount: ''
  });

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const bookingsQuery = query(
        collection(db, 'house_bookings'),
        where('isCheckedOut', '==', false)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookingsList = bookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HouseBooking[];

      setBookings(bookingsList);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const getHouseStatus = (houseId: string): 'available' | 'booked' => {
    return bookings.some(b => b.houseId === houseId && !b.isCheckedOut) ? 'booked' : 'available';
  };

  const getHouseBooking = (houseId: string) => {
    return bookings.find(b => b.houseId === houseId && !b.isCheckedOut);
  };

  const handleHouseClick = (house: typeof HOUSES[0]) => {
    const status = getHouseStatus(house.id);
    const booking = getHouseBooking(house.id);

    if (status === 'available') {
      setSelectedHouse(house);
      setCheckInModal(true);
    } else if (booking) {
      setSelectedBooking(booking);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHouse || !checkInForm.guestName || !checkInForm.phoneNumber || !checkInForm.idNumber || !checkInForm.rent || !checkInForm.initialPayment) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const rent = parseFloat(checkInForm.rent);
      const initialPayment = parseFloat(checkInForm.initialPayment);
      const daysOfStay = checkInForm.stayType === 'month' ? 30 : checkInForm.daysOfStay;

      const checkInDate = Timestamp.now();
      const checkOutDate = new Date();
      checkOutDate.setDate(checkOutDate.getDate() + daysOfStay);

      const bookingData = {
        houseId: selectedHouse.id,
        houseName: selectedHouse.name,
        guestName: checkInForm.guestName,
        phoneNumber: checkInForm.phoneNumber,
        idNumber: checkInForm.idNumber,
        numberOfGuests: checkInForm.numberOfGuests,
        daysOfStay: daysOfStay,
        rent: rent,
        initialPayment: initialPayment,
        paymentMode: checkInForm.paymentMode,
        checkedInAt: checkInDate,
        checkOutDate: Timestamp.fromDate(checkOutDate),
        isCheckedOut: false,
        pendingAmount: rent - initialPayment,
        extraFees: [],
        extensions: []
      };

      const bookingRef = await addDoc(collection(db, 'house_bookings'), bookingData);

      await addDoc(collection(db, 'house_bookings', bookingRef.id, 'payments'), {
        amount: initialPayment,
        mode: checkInForm.paymentMode,
        type: 'initial',
        timestamp: checkInDate,
        description: 'Initial payment at check-in'
      });

      await addDoc(collection(db, 'payments'), {
        type: 'check-in',
        amount: initialPayment,
        mode: checkInForm.paymentMode,
        paymentMode: checkInForm.paymentMode,
        customerName: checkInForm.guestName,
        roomNumber: selectedHouse.name,
        note: `House check-in: ${selectedHouse.name}`,
        timestamp: checkInDate,
        paymentStatus: 'completed',
        description: `Initial payment for ${selectedHouse.name}`,
      });

      toast.success('Check-in successful!');
      setCheckInModal(false);
      setSelectedHouse(null);
      setCheckInForm({
        guestName: '',
        phoneNumber: '',
        idNumber: '',
        numberOfGuests: 1,
        stayType: 'days',
        daysOfStay: 1,
        rent: '',
        initialPayment: '',
        paymentMode: 'cash'
      });
      fetchBookings();
    } catch (error) {
      console.error('Error during check-in:', error);
      toast.error('Check-in failed. Please try again.');
    }
  };

  const handleExtend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBooking || !extendForm.rentForDays) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const rentForDays = parseFloat(extendForm.rentForDays);
      const extensionData = {
        additionalDays: extendForm.additionalDays,
        rentForDays: rentForDays,
        timestamp: Timestamp.now()
      };

      const newCheckOutDate = new Date(selectedBooking.checkOutDate.toDate());
      newCheckOutDate.setDate(newCheckOutDate.getDate() + extendForm.additionalDays);

      const bookingRef = collection(db, 'house_bookings');
      const bookingDoc = await getDocs(query(bookingRef, where('__name__', '==', selectedBooking.id)));

      if (!bookingDoc.empty) {
        const docRef = bookingDoc.docs[0].ref;
        const currentExtensions = selectedBooking.extensions || [];
        const currentPending = selectedBooking.pendingAmount || 0;

        await addDoc(collection(db, 'house_bookings', selectedBooking.id, 'payments'), {
          amount: rentForDays,
          mode: 'n/a',
          type: 'extension',
          timestamp: Timestamp.now(),
          description: `Extension: ${extendForm.additionalDays} days`
        });

        const updatedBooking = {
          ...selectedBooking,
          extensions: [...currentExtensions, extensionData],
          checkOutDate: Timestamp.fromDate(newCheckOutDate),
          daysOfStay: selectedBooking.daysOfStay + extendForm.additionalDays,
          rent: selectedBooking.rent + rentForDays,
          pendingAmount: currentPending + rentForDays
        };

        await docRef.set(updatedBooking);

        toast.success('Stay extended successfully!');
        setExtendModal(false);
        setExtendForm({ additionalDays: 1, rentForDays: '' });
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (error) {
      console.error('Error extending stay:', error);
      toast.error('Failed to extend stay');
    }
  };

  const handleAddExtraFee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBooking || !extraFeeForm.description || !extraFeeForm.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const amount = parseFloat(extraFeeForm.amount);
      const extraFeeData = {
        description: extraFeeForm.description,
        amount: amount,
        timestamp: Timestamp.now()
      };

      const bookingRef = collection(db, 'house_bookings');
      const bookingDoc = await getDocs(query(bookingRef, where('__name__', '==', selectedBooking.id)));

      if (!bookingDoc.empty) {
        const docRef = bookingDoc.docs[0].ref;
        const currentExtraFees = selectedBooking.extraFees || [];
        const currentPending = selectedBooking.pendingAmount || 0;

        await addDoc(collection(db, 'house_bookings', selectedBooking.id, 'payments'), {
          amount: amount,
          mode: 'n/a',
          type: 'extra-fee',
          timestamp: Timestamp.now(),
          description: extraFeeForm.description
        });

        const updatedBooking = {
          ...selectedBooking,
          extraFees: [...currentExtraFees, extraFeeData],
          rent: selectedBooking.rent + amount,
          pendingAmount: currentPending + amount
        };

        await docRef.set(updatedBooking);

        toast.success('Extra fee added successfully!');
        setExtraFeeModal(false);
        setExtraFeeForm({ description: '', amount: '' });
        setSelectedBooking(null);
        fetchBookings();
      }
    } catch (error) {
      console.error('Error adding extra fee:', error);
      toast.error('Failed to add extra fee');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">House Management</h1>
        <p className="text-gray-600">Manage check-ins, extensions, and extra fees for houses</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOUSES.map((house) => {
            const status = getHouseStatus(house.id);
            const booking = getHouseBooking(house.id);

            return (
              <motion.div
                key={house.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleHouseClick(house)}
                className={`cursor-pointer rounded-lg border-2 shadow-lg overflow-hidden transition-all duration-200 ${
                  status === 'booked'
                    ? 'border-red-500 bg-red-50'
                    : 'border-green-500 bg-green-50 hover:shadow-xl'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-center justify-center mb-4">
                    <div
                      className={`w-16 h-16 rounded-full flex items-center justify-center ${
                        status === 'booked' ? 'bg-red-500' : 'bg-green-500'
                      }`}
                    >
                      <Home className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-center mb-2">{house.name}</h3>

                  <div
                    className={`text-center text-sm font-medium py-1 px-3 rounded-full ${
                      status === 'booked'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {status === 'booked' ? 'BOOKED' : 'AVAILABLE'}
                  </div>

                  {booking && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-700">
                          <Users className="h-4 w-4 mr-2" />
                          <span className="font-medium">{booking.guestName}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {booking.daysOfStay} days
                          </span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>
                            Until: {new Date(booking.checkOutDate.toDate()).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        {booking.pendingAmount > 0 && (
                          <div className="flex items-center text-red-600 font-semibold">
                            <DollarSign className="h-4 w-4 mr-2" />
                            <span>Pending: ₹{booking.pendingAmount.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selectedBooking && !checkInModal && !extendModal && !extraFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">{selectedBooking.houseName}</h2>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Guest Name</p>
                  <p className="font-medium">{selectedBooking.guestName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone Number</p>
                  <p className="font-medium">{selectedBooking.phoneNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">ID Number</p>
                  <p className="font-medium">{selectedBooking.idNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number of Guests</p>
                  <p className="font-medium">{selectedBooking.numberOfGuests}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Days of Stay</p>
                  <p className="font-medium">{selectedBooking.daysOfStay} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out Date</p>
                  <p className="font-medium">
                    {new Date(selectedBooking.checkOutDate.toDate()).toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Rent</p>
                    <p className="font-bold text-lg">₹{selectedBooking.rent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Paid Amount</p>
                    <p className="font-bold text-lg text-green-600">
                      ₹{selectedBooking.initialPayment.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pending Amount</p>
                    <p className="font-bold text-lg text-red-600">
                      ₹{selectedBooking.pendingAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {selectedBooking.extensions && selectedBooking.extensions.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Extensions</p>
                  <div className="space-y-2">
                    {selectedBooking.extensions.map((ext, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <p className="text-sm">
                          {ext.additionalDays} days - ₹{ext.rentForDays.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedBooking.extraFees && selectedBooking.extraFees.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Extra Fees</p>
                  <div className="space-y-2">
                    {selectedBooking.extraFees.map((fee, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <p className="text-sm font-medium">{fee.description}</p>
                        <p className="text-sm text-gray-600">₹{fee.amount.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setExtendModal(true);
                }}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Extend Stay
              </button>
              <button
                onClick={() => {
                  setExtraFeeModal(true);
                }}
                className="flex-1 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Extra Fee
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {checkInModal && selectedHouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-2xl font-bold mb-6">Check-In: {selectedHouse.name}</h2>

            <form onSubmit={handleCheckIn} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guest Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={checkInForm.guestName}
                    onChange={(e) => setCheckInForm({ ...checkInForm, guestName: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={checkInForm.phoneNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, phoneNumber: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={checkInForm.idNumber}
                    onChange={(e) => setCheckInForm({ ...checkInForm, idNumber: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Guests
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={checkInForm.numberOfGuests}
                    onChange={(e) => setCheckInForm({ ...checkInForm, numberOfGuests: parseInt(e.target.value) })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days of Stay <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={checkInForm.stayType === 'month'}
                        onChange={() => setCheckInForm({ ...checkInForm, stayType: 'month', daysOfStay: 30 })}
                        className="mr-2"
                      />
                      1 Month (30 days)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={checkInForm.stayType === 'days'}
                        onChange={() => setCheckInForm({ ...checkInForm, stayType: 'days' })}
                        className="mr-2"
                      />
                      Custom Days
                    </label>
                  </div>
                  {checkInForm.stayType === 'days' && (
                    <input
                      type="number"
                      min="1"
                      value={checkInForm.daysOfStay}
                      onChange={(e) => setCheckInForm({ ...checkInForm, daysOfStay: parseInt(e.target.value) })}
                      className="w-full rounded-md border-gray-300 shadow-sm mt-2"
                      placeholder="Enter number of days"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={checkInForm.rent}
                    onChange={(e) => setCheckInForm({ ...checkInForm, rent: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Initial Payment (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={checkInForm.initialPayment}
                    onChange={(e) => setCheckInForm({ ...checkInForm, initialPayment: e.target.value })}
                    className="w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={checkInForm.paymentMode === 'cash'}
                        onChange={() => setCheckInForm({ ...checkInForm, paymentMode: 'cash' })}
                        className="mr-2"
                      />
                      Cash
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={checkInForm.paymentMode === 'gpay'}
                        onChange={() => setCheckInForm({ ...checkInForm, paymentMode: 'gpay' })}
                        className="mr-2"
                      />
                      GPay
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setCheckInModal(false);
                    setSelectedHouse(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Complete Check-In
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {extendModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Extend Stay</h2>

            <form onSubmit={handleExtend} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Days <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={extendForm.additionalDays}
                  onChange={(e) => setExtendForm({ ...extendForm, additionalDays: parseInt(e.target.value) })}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent for Additional Days (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extendForm.rentForDays}
                  onChange={(e) => setExtendForm({ ...extendForm, rentForDays: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setExtendModal(false);
                    setExtendForm({ additionalDays: 1, rentForDays: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Extend Stay
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {extraFeeModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <h2 className="text-xl font-bold mb-4">Add Extra Fee</h2>

            <form onSubmit={handleAddExtraFee} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description / Remark <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={extraFeeForm.description}
                  onChange={(e) => setExtraFeeForm({ ...extraFeeForm, description: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                  placeholder="e.g., Electricity bill, Damage charges"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extraFeeForm.amount}
                  onChange={(e) => setExtraFeeForm({ ...extraFeeForm, amount: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setExtraFeeModal(false);
                    setExtraFeeForm({ description: '', amount: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700"
                >
                  Add Fee
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HousePage;
