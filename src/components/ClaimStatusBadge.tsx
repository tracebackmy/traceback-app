import { ItemClaimStatus } from '@/types/claim';

interface ClaimStatusBadgeProps {
  status: ItemClaimStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function ClaimStatusBadge({ status, size = 'md' }: ClaimStatusBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const statusConfig = {
    unclaimed: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      label: 'Available'
    },
    'claim-pending': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Claim Pending'
    },
    claimed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Claimed'
    },
    'under-review': {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      label: 'Under Review'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${config.bg} ${config.text} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
}