export interface PaymentProvider {
  name: string;
  /** Create a checkout session or invoice */
  createPayment(amount: number, customerId: string, metadata: any): Promise<{ url: string; invoiceId: string }>;
  /** Verify if a payment was successful */
  verifyPayment(paymentId: string): Promise<{ status: 'paid' | 'unpaid' | 'failed' }>;
  /** Handle webhooks from the provider */
  handleWebhook(payload: any, signature: string): Promise<void>;
}

export class ManualInvoiceProvider implements PaymentProvider {
  name = "Manual Invoicing";

  async createPayment(amount: number, customerId: string, metadata: any) {
    // In a real app, this would generate a PDF or email invoice via an API.
    // For the Concierge MVP, we just return a placeholder and an internal ID.
    return {
      url: "/support?invoice=manual",
      invoiceId: `inv_${Date.now()}`,
    };
  }

  async verifyPayment(paymentId: string): Promise<{ status: 'paid' | 'unpaid' | 'failed' }> {
    // Manual providers are verified by an admin in the DB.
    // This function returns unpaid by default; the admin toggle is the source of truth.
    return { status: 'unpaid' };
  }

  async handleWebhook() {
    // No webhooks for manual payments.
    return;
  }
}
