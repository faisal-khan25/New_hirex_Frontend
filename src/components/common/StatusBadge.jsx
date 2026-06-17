const colors = {
  APPLIED:     'badge-blue',
  SHORTLISTED: 'badge-yellow',
  REJECTED:    'badge-red',
  HIRED:       'badge-green',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${colors[status] || 'badge-gray'}`}>{status}</span>;
}
