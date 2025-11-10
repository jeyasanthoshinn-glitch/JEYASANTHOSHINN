/*
  # Create Advance Bookings Table

  1. New Tables
    - `advance_bookings`
      - `id` (uuid, primary key)
      - `name` (text, guest name)
      - `mobile` (text, mobile number)
      - `aadhar` (text, Aadhar number)
      - `date_of_booking` (date, booking date)
      - `room_type` (text, AC or NON-AC)
      - `number_of_rooms` (integer, number of rooms booked)
      - `advance_amount` (numeric, advance payment)
      - `rooms` (jsonb, array of room details with roomId, roomNumber, price, persons)
      - `status` (text, active or cancelled)
      - `created_at` (timestamptz, creation timestamp)
      - `cancelled_at` (timestamptz, cancellation timestamp)
      - `refund_amount` (numeric, refund amount if cancelled)

  2. Security
    - Enable RLS on `advance_bookings` table
    - Add policy for authenticated users to read all bookings
    - Add policy for authenticated users to create bookings
    - Add policy for authenticated users to update bookings
    - Add policy for authenticated users to delete bookings
*/

CREATE TABLE IF NOT EXISTS advance_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  aadhar text NOT NULL,
  date_of_booking date NOT NULL,
  room_type text NOT NULL,
  number_of_rooms integer NOT NULL DEFAULT 1,
  advance_amount numeric NOT NULL DEFAULT 0,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  cancelled_at timestamptz,
  refund_amount numeric DEFAULT 0
);

ALTER TABLE advance_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all advance bookings"
  ON advance_bookings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create advance bookings"
  ON advance_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update advance bookings"
  ON advance_bookings
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete advance bookings"
  ON advance_bookings
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_advance_bookings_date ON advance_bookings(date_of_booking);
CREATE INDEX IF NOT EXISTS idx_advance_bookings_status ON advance_bookings(status);
CREATE INDEX IF NOT EXISTS idx_advance_bookings_created_at ON advance_bookings(created_at DESC);