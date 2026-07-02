import { useEffect, useMemo, useState } from 'react'
import { Bike, CalendarDays, Car, CreditCard } from 'lucide-react'
import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../context/AuthContext'
import { subscriptionApi, type SubscriptionPackageDto } from '../../utils/apiServices'
import { toUtcIsoString } from '../../utils/dateTime'
import { formatCurrency } from '../../utils/pricing'

type VehicleFilter = 'all' | 'car' | 'bike'

const isActivePackage = (pkg: SubscriptionPackageDto) =>
  pkg.status.toLowerCase() === 'active'

const getVehicleFilter = (pkg: SubscriptionPackageDto): VehicleFilter => {
  const name = (pkg.vehicleTypeName ?? '').toLowerCase()
  if (name.includes('car') || name.includes('oto') || name.includes('o to') || name.includes('ô tô')) {
    return 'car'
  }
  if (name.includes('bike') || name.includes('motor') || name.includes('xe may') || name.includes('xe máy')) {
    return 'bike'
  }
  return 'all'
}

const getApiErrorMessage = (err: unknown) => {
  const apiError = err as {
    response?: { data?: { message?: string } }
    data?: { message?: string }
    message?: string
  }

  const responseMessage = apiError.response?.data?.message || apiError.data?.message
  if (responseMessage) return responseMessage

  if (!(err instanceof Error)) return null
  const jsonStart = err.message.indexOf('{')
  if (jsonStart === -1) return err.message || null

  try {
    const parsed = JSON.parse(err.message.slice(jsonStart)) as { message?: string }
    return parsed.message || err.message
  } catch {
    return err.message
  }
}

function SubscribeContent() {
  const { profile } = useAuth()
  const [vehicle, setVehicle] = useState<VehicleFilter>('all')
  const [packages, setPackages] = useState<SubscriptionPackageDto[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [licensePlate, setLicensePlate] = useState(profile?.vehiclePlate ?? '')
  const [loadingPackages, setLoadingPackages] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activePackages = useMemo(
    () => packages.filter(isActivePackage),
    [packages],
  )

  const visiblePackages = useMemo(
    () =>
      activePackages.filter((pkg) => {
        if (vehicle === 'all') return true
        const packageVehicle = getVehicleFilter(pkg)
        return packageVehicle === vehicle || packageVehicle === 'all'
      }),
    [activePackages, vehicle],
  )

  const selectedPackage =
    visiblePackages.find((pkg) => pkg.packageId === selectedPackageId) ??
    visiblePackages[0] ??
    null

  useEffect(() => {
    if (profile?.vehiclePlate) setLicensePlate(profile.vehiclePlate)
  }, [profile])

  useEffect(() => {
    let ignore = false

    const loadPackages = async () => {
      setLoadingPackages(true)
      setError('')
      try {
        const res = await subscriptionApi.getPackages()
        if (ignore) return

        if (res.isSuccess && Array.isArray(res.result)) {
          setPackages(res.result)
          setSelectedPackageId(res.result.find(isActivePackage)?.packageId ?? '')
        } else {
          setError(res.message || 'Cannot load subscription packages.')
        }
      } catch (err) {
        console.error(err)
        if (!ignore) setError(getApiErrorMessage(err) || 'Cannot connect to the server. Please try again.')
      } finally {
        if (!ignore) setLoadingPackages(false)
      }
    }

    loadPackages()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!selectedPackage) {
      setSelectedPackageId('')
      return
    }
    if (selectedPackage.packageId !== selectedPackageId) {
      setSelectedPackageId(selectedPackage.packageId)
    }
  }, [selectedPackage, selectedPackageId])

  const handleSubscribe = async () => {
    if (!selectedPackage) {
      setError('Please select an active subscription package.')
      return
    }
    if (!licensePlate.trim()) {
      setError('Please enter a license plate.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await subscriptionApi.register({
        packageId: selectedPackage.packageId,
        licensePlate: licensePlate.trim(),
        startDateUtc: toUtcIsoString(new Date()),
      })

      if (res.isSuccess && res.result?.paymentUrl) {
        window.location.assign(res.result.paymentUrl)
        return
      }

      setError(res.message || 'Subscription registration failed.')
    } catch (err) {
      console.error(err)
      setError(getApiErrorMessage(err) || 'Cannot connect to the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="subscribe-page">
      <header className="page-header">
        <div>
          <h1>Monthly Subscription Plan</h1>
          <p>Select an active backend package, enter the vehicle plate, then complete PayOS payment.</p>
        </div>
      </header>

      <div className="subscribe-layout">
        <div className="card-panel">
          <h2>Vehicle</h2>
          <div className="vehicle-toggle subscribe-vehicle-toggle">
            <button type="button" className={vehicle === 'all' ? 'active' : ''} onClick={() => setVehicle('all')}>
              All
            </button>
            <button type="button" className={vehicle === 'car' ? 'active' : ''} onClick={() => setVehicle('car')}>
              <Car size={18} /> Car
            </button>
            <button type="button" className={vehicle === 'bike' ? 'active' : ''} onClick={() => setVehicle('bike')}>
              <Bike size={18} /> Bike
            </button>
          </div>

          <label className="hero-field">
            <span>License plate</span>
            <div>
              <Car size={18} />
              <input
                type="text"
                value={licensePlate}
                onChange={(event) => setLicensePlate(event.target.value.toUpperCase())}
                placeholder="51A-12345"
              />
            </div>
          </label>
        </div>

        <div className="card-panel">
          <h2>Package</h2>
          {loadingPackages ? (
            <p className="section-desc">Loading packages...</p>
          ) : visiblePackages.length === 0 ? (
            <p className="alert-inline alert-error">No active package is available for this vehicle type.</p>
          ) : (
            <div className="subscribe-plans">
              {visiblePackages.map((pkg) => (
                <button
                  key={pkg.packageId}
                  type="button"
                  className={`subscribe-plan-btn${selectedPackage?.packageId === pkg.packageId ? ' active' : ''}`}
                  onClick={() => setSelectedPackageId(pkg.packageId)}
                >
                  <span className="plan-tag">{pkg.vehicleTypeName || 'Vehicle'}</span>
                  <strong>{pkg.packageName}</strong>
                  <span>{formatCurrency(pkg.price)}</span>
                  <small>
                    <CalendarDays size={14} /> {pkg.durationMonths} month{pkg.durationMonths > 1 ? 's' : ''}
                  </small>
                  {pkg.requireFixedSlot && <small>Fixed slot required</small>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="subscribe-footer card-panel">
        <div>
          <span>Total payment</span>
          <strong>{selectedPackage ? formatCurrency(selectedPackage.price) : formatCurrency(0)}</strong>
          <small>{selectedPackage?.packageName ?? 'No package selected'}</small>
        </div>
        {error && <p className="alert-inline alert-error">{error}</p>}
        <button
          type="button"
          className="btn btn-primary"
          disabled={loadingPackages || submitting || !selectedPackage}
          onClick={handleSubscribe}
        >
          <CreditCard size={18} />
          {submitting ? 'Creating payment...' : 'Register and pay'}
        </button>
      </div>
    </section>
  )
}

export default function SubscribeMonthly() {
  return (
    <ProtectedRoute allowedRoles={['user', 'customer']}>
      <SubscribeContent />
    </ProtectedRoute>
  )
}
