export default function DashboardPage() {
  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>Total Marketing Campaigns</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>12</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>Active Employees</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>5</p>
        </div>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>Monthly Budget Used</h3>
          <p style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>$4,500</p>
        </div>
      </div>
    </div>
  )
}
