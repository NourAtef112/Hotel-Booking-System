import React, { useEffect, useState } from 'react';
import { generatePaymentUrl, CheckoutRequest } from '../../services/paymentApi';

interface GuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: number;
  amountCents: number;
  guestInfo: GuestInfo;
}

type ModalState = 'loading' | 'ready' | 'error';

const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  amountCents,
  guestInfo,
}) => {
  const [state, setState] = useState<ModalState>('loading');
  const [paymentUrl, setPaymentUrl] = useState<string>('');

  const fetchPaymentUrl = async () => {
    setState('loading');
    try {
      const request: CheckoutRequest = {
        booking_id: bookingId,
        amount_cents: amountCents,
        currency: 'EGP',
        guest_first_name: guestInfo.firstName,
        guest_last_name: guestInfo.lastName,
        guest_email: guestInfo.email,
        guest_phone: guestInfo.phone,
      };
      const response = await generatePaymentUrl(request);
      // el public key fy el URL — safe lel browser
      // el secret key mesh geh hena khales
      setPaymentUrl(response.payment_url);
      setState('ready');
    } catch {
      setState('error');
    }
  };

  useEffect(() => {
    if (isOpen) fetchPaymentUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // backdrop
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">

      {/* modal card */}
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Secure Payment
            </h2>
            <p className="text-sm text-gray-500">
              E-JUST Guest House · Booking #{bookingId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* body */}
        <div className="p-6">

          {/* STATE: loading */}
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-500 text-sm">
                Connecting to payment gateway...
              </p>
            </div>
          )}

          {/* STATE: ready — Paymob iframe */}
          {state === 'ready' && (
            <iframe
              src={paymentUrl}
              width="100%"
              height="600px"
              className="rounded-lg border-0"
              title="Paymob Secure Checkout"
              allow="payment"
            />
          )}

          {/* STATE: error */}
          {state === 'error' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-sm">
                <p className="text-red-700 font-medium mb-1">
                  Payment gateway unavailable
                </p>
                <p className="text-red-500 text-sm">
                  Could not connect to Paymob. Please try again.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fetchPaymentUrl}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* footer — only visible when iframe is loaded */}
        {state === 'ready' && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-gray-500">
              Secured by Paymob · PCI DSS Compliant · Your card details never touch our servers
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
