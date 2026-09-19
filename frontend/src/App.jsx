import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './Context/AuthContext'
import BuddyPage from './Pages/Buddy/BuddyPage'
import CallsPage from './Pages/Calls/CallsPage'
import LandingPage from './Pages/Common/LandingPage'
import LoginPage from './Pages/Common/LoginPage'
import RegisterPage from './Pages/Common/RegisterPage'
import VerifyEmailPage from './Pages/Common/VerifyEmailPage'
import LandlordHomePage from './Pages/Landlord/LandlordHomePage'
import LandlordSignaturePage from './Pages/Landlord/LandlordSignaturePage'
import LandlordListingsPage from './Pages/Listings/LandlordListingsPage'
import ListingDetailPage from './Pages/Listings/ListingDetailPage'
import MessagesPage from './Pages/Messages/MessagesPage'
import RentalsPage from './Pages/Rentals/RentalsPage'
import UserListingsPage from './Pages/Listings/UserListingsPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserProfilePage from './Pages/User/UserProfilePage'
import SavedListingsPage from './Pages/User/SavedListingsPage'

// The Agora SDK is a megabyte of WebRTC; it only loads once someone opens a call room.
const CallRoomPage = lazy(() => import('./Pages/Calls/CallRoomPage'))

function RoleRoute({ role, children }) {
  const { role: currentRole } = useAuth()

  return [].concat(role).includes(currentRole) ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/verify-email"
        element={(
          <RoleRoute role={['user', 'landlord']}>
            <VerifyEmailPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/user"
        element={(
          <RoleRoute role="user">
            <UserHomePage />
          </RoleRoute>
        )}
      />
      <Route
        path="/landlord"
        element={(
          <RoleRoute role="landlord">
            <LandlordHomePage />
          </RoleRoute>
        )}
      />
      <Route
        path="/landlord/signature"
        element={(
          <RoleRoute role="landlord">
            <LandlordSignaturePage />
          </RoleRoute>
        )}
      />
      <Route
        path="/landlord/listings"
        element={(
          <RoleRoute role="landlord">
            <LandlordListingsPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/user/profile"
        element={(
          <RoleRoute role="user">
            <UserProfilePage />
          </RoleRoute>
        )}
      />
      <Route
        path="/saved"
        element={(
          <RoleRoute role="user">
            <SavedListingsPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/buddies"
        element={(
          <RoleRoute role="user">
            <BuddyPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/user/listings"
        element={(
          <RoleRoute role="user">
            <UserListingsPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/listings/:listingId"
        element={(
          <RoleRoute role="user">
            <ListingDetailPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/messages"
        element={(
          <RoleRoute role={['user', 'landlord']}>
            <MessagesPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/calls"
        element={(
          <RoleRoute role={['user', 'landlord']}>
            <CallsPage />
          </RoleRoute>
        )}
      />
      <Route
        path="/calls/:callId/room"
        element={(
          <RoleRoute role={['user', 'landlord']}>
            <Suspense fallback={<p className="p-8 text-sm text-slate-600">Loading call…</p>}>
              <CallRoomPage />
            </Suspense>
          </RoleRoute>
        )}
      />
      <Route
        path="/rentals"
        element={(
          <RoleRoute role={['user', 'landlord']}>
            <RentalsPage />
          </RoleRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
