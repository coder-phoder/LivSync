import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './Context/AuthContext'
import BuddyPage from './Pages/Buddy/BuddyPage'
import CallsPage from './Pages/Calls/CallsPage'
import LandingPage from './Pages/Common/LandingPage'
import VerifyEmailPage from './Pages/Common/VerifyEmailPage'
import LandlordHomePage from './Pages/Landlord/LandlordHomePage'
import LandlordLoginPage from './Pages/Landlord/LandlordLoginPage'
import LandlordRegisterPage from './Pages/Landlord/LandlordRegisterPage'
import LandlordSignaturePage from './Pages/Landlord/LandlordSignaturePage'
import LandlordListingsPage from './Pages/Listings/LandlordListingsPage'
import ListingDetailPage from './Pages/Listings/ListingDetailPage'
import MessagesPage from './Pages/Messages/MessagesPage'
import RentalsPage from './Pages/Rentals/RentalsPage'
import UserListingsPage from './Pages/Listings/UserListingsPage'
import UserHomePage from './Pages/User/UserHomePage'
import UserLoginPage from './Pages/User/UserLoginPage'
import UserProfilePage from './Pages/User/UserProfilePage'
import UserRegisterPage from './Pages/User/UserRegisterPage'
import SavedListingsPage from './Pages/User/SavedListingsPage'

// The Agora SDK is a megabyte of WebRTC; it only loads once someone opens a call room.
const CallRoomPage = lazy(() => import('./Pages/Calls/CallRoomPage'))

function RoleRoute({ role, children }) {
  const { role: currentRole } = useAuth()
  const loginPath = role === 'landlord' ? '/landlord/login' : '/user/login'

  return [].concat(role).includes(currentRole) ? children : <Navigate to={loginPath} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/user/login" element={<UserLoginPage />} />
      <Route path="/user/register" element={<UserRegisterPage />} />
      <Route path="/landlord/login" element={<LandlordLoginPage />} />
      <Route path="/landlord/register" element={<LandlordRegisterPage />} />
      <Route path="/login" element={<Navigate to="/user/login" replace />} />
      <Route path="/register" element={<Navigate to="/user/register" replace />} />
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
