# House Management Feature - Implementation Guide

## Overview
The House Page feature provides complete management for four houses with check-in, extension, and extra fee capabilities. All data is synchronized across Room Matrix and Payment pages.

## Features Implemented

### 1. House Page
**Location:** `/houses`

**Four Houses:**
- White House - Ground Floor
- White House - First Floor
- White House - Second Floor
- Guest House

**Visual Indicators:**
- Green cards with "AVAILABLE" badge for vacant houses
- Red cards with "BOOKED" badge for occupied houses
- Guest details displayed on booked houses
- Pending amount indicator for houses with outstanding payments

### 2. Check-In Flow

**Process:**
1. Click on an available house (green card)
2. Fill in the check-in form:
   - Guest Name (required)
   - Phone Number (required)
   - ID Number (required)
   - Number of Guests
   - Days of Stay:
     - Option A: 1 Month (automatically sets 30 days)
     - Option B: Custom days (enter manually)
   - Rent for selected duration (required)
   - Initial Payment (required)
   - Payment Mode: Cash or GPay (required)

**What Happens:**
- Creates booking in `house_bookings` collection
- Records initial payment in `house_bookings/{bookingId}/payments`
- Adds payment to global `payments` collection
- Calculates pending amount: Rent - Initial Payment
- Sets check-out date based on days of stay
- House status changes to BOOKED (red card)

### 3. Extend Stay Feature

**Process:**
1. Click on a booked house (red card)
2. Click "Extend Stay" button
3. Enter:
   - Additional Days (required)
   - Rent for Additional Days (required)

**What Happens:**
- Adds extension record to booking
- Updates check-out date (adds additional days)
- Increases total rent by extension amount
- Increases pending amount by extension amount
- Records extension in payment history
- Updates Room Matrix summary

### 4. Add Extra Fee Feature

**Process:**
1. Click on a booked house (red card)
2. Click "Add Extra Fee" button
3. Enter:
   - Description/Remark (required)
   - Amount (required)

**What Happens:**
- Adds extra fee record to booking
- Increases total rent by extra fee amount
- Increases pending amount by extra fee amount
- Records fee in payment history
- Example use cases: Electricity bill, Damage charges, Late fee

### 5. Room Matrix Summary

**Location:** Top of Room Matrix page (`/rooms/matrix`)

**Displays:**
- VACANT (Green): Available rooms count
- FULL (Red): Occupied rooms count
- CLEAN (Yellow): Cleaning status rooms count
- TOTAL ROOMS: Total room count
- HOUSES VACANT (Green): Available houses count
- HOUSES FULL (Red): Booked houses count
- TOTAL HOUSES: Total houses (4)

**Auto-Updates:**
- Refreshes every 60 seconds
- Updates when check-ins occur
- Updates when bookings end
- Updates when status changes

### 6. Payment Page Integration

**House payments automatically appear in:**
- Payment logs with proper categorization
- Daily payment summaries
- Collection totals
- Payment mode breakdown (Cash/GPay)

**Payment Types:**
- `check-in`: Initial payment at house check-in
- `extension`: Extension payment
- `extra-fee`: Additional charges

## Database Structure

### Collections

#### 1. house_bookings
```javascript
{
  id: string,
  houseId: string,                    // white-house-ground, white-house-first, etc.
  houseName: string,                  // Display name
  guestName: string,
  phoneNumber: string,
  idNumber: string,
  numberOfGuests: number,
  daysOfStay: number,
  rent: number,                       // Total rent (includes extensions & extra fees)
  initialPayment: number,
  paymentMode: 'cash' | 'gpay',
  checkedInAt: Timestamp,
  checkOutDate: Timestamp,
  isCheckedOut: boolean,
  pendingAmount: number,              // Calculated: rent - initialPayment
  extraFees: [
    {
      description: string,
      amount: number,
      timestamp: Timestamp
    }
  ],
  extensions: [
    {
      additionalDays: number,
      rentForDays: number,
      timestamp: Timestamp
    }
  ]
}
```

#### 2. house_bookings/{bookingId}/payments
```javascript
{
  amount: number,
  mode: 'cash' | 'gpay' | 'n/a',     // n/a for extensions/fees
  type: 'initial' | 'extension' | 'extra-fee',
  timestamp: Timestamp,
  description: string
}
```

#### 3. payments (Global)
```javascript
{
  type: 'check-in' | 'extension' | 'extra-fee',
  amount: number,
  mode: 'cash' | 'gpay',
  paymentMode: 'cash' | 'gpay',
  customerName: string,
  roomNumber: string,                 // House name for houses
  note: string,
  timestamp: Timestamp,
  paymentStatus: 'completed',
  description: string
}
```

## Data Synchronization

### House Check-In
1. Creates booking in `house_bookings`
2. Adds payment to `house_bookings/{id}/payments`
3. Adds payment to global `payments` collection
4. Room Matrix summary updates automatically
5. Payment page shows new transaction

### Extend Stay
1. Updates booking with extension data
2. Adds payment entry (mode: 'n/a', type: 'extension')
3. Increases rent and pending amount
4. Updates check-out date
5. Room Matrix summary refreshes

### Add Extra Fee
1. Updates booking with extra fee data
2. Adds payment entry (mode: 'n/a', type: 'extra-fee')
3. Increases rent and pending amount
4. Shows in booking details

## User Interface

### House Cards
- **Available:** Green background, green border
- **Booked:** Red background, red border
- **Icon:** House icon in circular badge
- **Status Badge:** Green "AVAILABLE" or Red "BOOKED"

### Booking Details Modal
Shows when clicking booked house:
- Guest information
- Stay duration
- Check-out date
- Total rent
- Paid amount
- Pending amount (highlighted in red)
- Extension history
- Extra fees history
- Action buttons: Extend Stay, Add Extra Fee

### Check-In Modal
- Clean form layout
- Required field indicators (red asterisk)
- Radio buttons for stay type
- Dynamic days input
- Payment mode selection
- Validation on submit

## Testing Checklist

- [ ] Can view all 4 houses on House Page
- [ ] Available houses show green
- [ ] Can check-in to available house
- [ ] Booked house shows red with guest details
- [ ] Pending amount displays correctly
- [ ] Can extend stay for booked house
- [ ] Check-out date updates after extension
- [ ] Can add extra fees
- [ ] Extra fees increase pending amount
- [ ] Room Matrix summary shows house counts
- [ ] Summary updates after check-in
- [ ] House payments appear in Payment page
- [ ] Payment mode categorization correct
- [ ] All data persists across page refreshes

## Important Notes

1. **House IDs are fixed:**
   - white-house-ground
   - white-house-first
   - white-house-second
   - guest-house

2. **Pending Amount Calculation:**
   - Base: Rent - Initial Payment
   - Extensions add to rent
   - Extra fees add to rent
   - Pending increases with extensions/fees

3. **Payment Modes:**
   - Initial payment: Cash or GPay
   - Extensions: n/a (no payment, just rent increase)
   - Extra fees: n/a (no payment, just rent increase)

4. **Auto-Refresh:**
   - Room Matrix summary: 60 seconds
   - House page bookings: Manual refresh or navigate away/back

5. **Navigation:**
   - House Page: `/houses`
   - Accessible from sidebar navigation
   - Icon: Home (from lucide-react)

## Future Enhancements

Potential improvements:
- Check-out functionality for houses
- Payment collection for house pending amounts
- House-specific payment history view
- SMS/Email notifications for check-in
- House maintenance status
- Cleaning status for houses
- House-specific reports
- Bulk operations

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase connection
3. Ensure collections exist in Firestore
4. Check data structure matches documentation
5. Verify proper indexing in Firestore

## Success Criteria

Feature is working correctly when:
1. All houses display with correct status
2. Check-in process completes successfully
3. Bookings appear in database
4. Payments sync to Payment page
5. Room Matrix summary shows house data
6. Extensions and extra fees work correctly
7. Pending amounts calculate accurately
8. UI is responsive and user-friendly
9. No console errors
10. Data persists correctly
