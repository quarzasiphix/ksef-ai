import { Customer, BusinessProfile } from '@/shared/types';

/**
 * Represents a customer that is also a user of the system
 * Matched via tax_id (NIP) between customers and business_profiles
 */
export interface ConnectedClient {
  customer_id: string;
  customer_name: string;
  customer_tax_id: string;
  business_profile_id: string;
  business_profile_name: string;
  business_profile_tax_id: string;
  connected_user_id: string;
  match_type: 'tax_id' | 'manual';
  verified: boolean;
}

/**
 * Matches customers with business profiles via tax_id (NIP)
 * This creates a list of "connected clients" - customers who are also users of the app
 * 
 * @param customers - List of all customers
 * @param businessProfiles - List of all business profiles
 * @returns Array of connected clients with matching information
 */
export function matchConnectedClients(
  customers: Customer[],
  businessProfiles: BusinessProfile[]
): ConnectedClient[] {
  const connections: ConnectedClient[] = [];
  
  // Filter out customers and profiles without taxId
  const customersWithTaxId = customers.filter(c => c.taxId && c.taxId.trim() !== '');
  const profilesWithTaxId = businessProfiles.filter(bp => bp.taxId && bp.taxId.trim() !== '');
  
  // Create a map for faster lookup
  const profilesByTaxId = new Map<string, BusinessProfile>();
  for (const profile of profilesWithTaxId) {
    // Normalize taxId (remove spaces, dashes, etc.)
    const normalizedTaxId = normalizeTaxId(profile.taxId!);
    profilesByTaxId.set(normalizedTaxId, profile);
  }
  
  // Match customers with business profiles
  for (const customer of customersWithTaxId) {
    const normalizedCustomerTaxId = normalizeTaxId(customer.taxId!);
    const matchedProfile = profilesByTaxId.get(normalizedCustomerTaxId);
    
    if (matchedProfile) {
      connections.push({
        customer_id: customer.id,
        customer_name: customer.name,
        customer_tax_id: customer.taxId!,
        business_profile_id: matchedProfile.id,
        business_profile_name: matchedProfile.name,
        business_profile_tax_id: matchedProfile.taxId!,
        connected_user_id: matchedProfile.user_id,
        match_type: 'tax_id',
        verified: true,
      });
    }
  }
  
  return connections;
}

/**
 * Normalizes tax_id (NIP) for comparison
 * Removes spaces, dashes, and converts to uppercase
 */
function normalizeTaxId(taxId: string): string {
  return taxId.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Creates a fast lookup map for checking if customer is connected
 * Key: customer_id, Value: ConnectedClient
 * 
 * @param connectedClients - Array of connected clients
 * @returns Map for O(1) lookup
 */
export function createConnectedClientsMap(
  connectedClients: ConnectedClient[]
): Map<string, ConnectedClient> {
  return new Map(
    connectedClients.map(cc => [cc.customer_id, cc])
  );
}

/**
 * Check if a customer is a connected user (has business profile in system)
 * 
 * @param customerId - Customer ID to check
 * @param connectedClientsMap - Map of connected clients
 * @returns true if customer is connected, false otherwise
 */
export function isCustomerConnected(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): boolean {
  return connectedClientsMap.has(customerId);
}

/**
 * Get connected client information for a customer
 * 
 * @param customerId - Customer ID to look up
 * @param connectedClientsMap - Map of connected clients
 * @returns ConnectedClient if found, null otherwise
 */
export function getConnectedClient(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): ConnectedClient | null {
  return connectedClientsMap.get(customerId) || null;
}

/**
 * Get the business profile ID for a connected customer
 * 
 * @param customerId - Customer ID
 * @param connectedClientsMap - Map of connected clients
 * @returns Business profile ID if connected, null otherwise
 */
export function getConnectedBusinessProfileId(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): string | null {
  const connectedClient = connectedClientsMap.get(customerId);
  return connectedClient?.business_profile_id || null;
}

/**
 * Get the user ID for a connected customer
 * 
 * @param customerId - Customer ID
 * @param connectedClientsMap - Map of connected clients
 * @returns User ID if connected, null otherwise
 */
export function getConnectedUserId(
  customerId: string,
  connectedClientsMap: Map<string, ConnectedClient>
): string | null {
  const connectedClient = connectedClientsMap.get(customerId);
  return connectedClient?.connected_user_id || null;
}
