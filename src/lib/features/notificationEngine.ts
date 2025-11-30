
import { Item, ClaimRequest } from '@/types';

export const NotificationEngine = {
  
  generateMatchFoundMessage: (foundItem: Item): string => {
    return `Potential match found! A "${foundItem.title}" was found at ${foundItem.stationId} that matches your description. Check your dashboard.`;
  },

  generateClaimStatusMessage: (claim: ClaimRequest, status: string): string => {
    switch (status) {
      case 'approved':
        return `Great news! Your claim for item #${claim.itemId} has been APPROVED. Please check instructions for collection.`;
      case 'rejected':
        return `Update on your claim for item #${claim.itemId}: The claim was rejected. Check your inbox for details.`;
      case 'verification-chat':
        return `Action Required: Admin has requested more information for your claim on item #${claim.itemId}.`;
      default:
        return `Your claim status has been updated to: ${status.replace('-', ' ')}.`;
    }
  },

  generateTicketUpdateMessage: (ticketId: string, senderName: string): string => {
    return `New message from ${senderName} on ticket #${ticketId}.`;
  }
};
