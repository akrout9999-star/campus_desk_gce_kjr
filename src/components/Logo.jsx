import logoUrl from '../assets/logo-gcekj.png'

export default function Logo({ size = 40, className = '' }) {
  return (
    <img
      src={logoUrl}
      alt="GCE Keonjhar Logo"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  )
}
