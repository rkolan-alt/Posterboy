/** Centered spinner shown while a ranking/matching crawl is in flight. */
export default function LoadingModule({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.2em',
        padding: '4em 1em',
        minHeight: 320,
      }}
    >
      <div className="spinner" />
      <p style={{ margin: 0, opacity: 0.8 }}>{label}</p>
    </div>
  )
}
