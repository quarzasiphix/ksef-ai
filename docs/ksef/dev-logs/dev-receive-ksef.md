Receiving Invoices from KSeF (KsięgaI as Recipient)

Perhaps even more important for many businesses is receiving purchase invoices through KSeF. In the scenario you described (e.g. getting a fuel invoice from a gas station), once KSeF is mandatory, that gas station will upload the invoice to KSeF and list your company’s NIP as the buyer. Your company then needs to retrieve that invoice. KSięgaI can be extended to handle this automatically, ensuring your accountant “automatically receives the invoice” in your accounting system.

Here’s how receiving would work and how we can implement it:

Authorization for Retrieval: First, your KSięgaI app (or rather, the backend service) needs permission to fetch your company’s invoices from KSeF. This is similar to sending – you need to use your company’s KSeF credentials. Typically, the same token/certificate used for sending can be used to query incoming invoices as well (with proper scope). Alternatively, KSeF allows granting read-only access to third parties. Some companies might authorize their accounting office (via a certificate or token) to pull invoices on their behalf. Assuming KSięgaI is acting as your company’s own system, it will use the company’s token to get the data.

Polling/Querying KSeF for New Invoices: KSeF does not push notifications to the buyer when an invoice is issued. There won’t be an email saying “You have a new invoice from Shell Gas Station.” Instead, your software must check the KSeF system periodically to find any new incoming invoices. In practice, KSięgaI could implement a scheduled job (maybe an hourly or daily cron) or a manual “Sync invoices” action to:

Call a KSeF API endpoint that lists invoices where your company is the buyer (cost invoices). The API might allow filtering by date (e.g. “give me all invoices from the last day for NIP X”) or provide an endpoint like “/api/invoices?direction=received”. According to integration services, there are operations for searching and bulk downloading invoices from KSeF. So one approach is to query by date range: for example, each day ask for any invoices with issue date = today (or yesterday) that have your NIP as buyer.

Another method could be to keep track of the last retrieved invoice ID or timestamp and ask for anything newer than that.

However it’s done, the result will be a list of invoice metadata or IDs.

Downloading the Invoice Data: Once the app identifies invoices that haven’t been seen before, it will download each invoice’s XML from KSeF. The API might provide the full XML in the search response or require a separate call per invoice ID to fetch the document. The KSeF API provided by third parties includes bulk download capabilities – meaning you can fetch multiple invoices in one go if needed. The raw result will be the same structured XML that the supplier uploaded.

Import into KSięgaI: KSięgaI will then take that XML and convert it into an internal invoice record. This is essentially the reverse of the sending process:

Parse the XML (either by writing an XML parser or using a library) to extract invoice fields. The fields will include seller info, buyer info (which should match your company), line items, totals, dates, payment terms, etc.

Create a new Invoice entry in your database representing this purchase invoice. It would probably be marked as transactionType: 'cost' or similar (since it’s an incoming invoice, not your sale). In the code we saw fields like transaction_type which may be 'income' or 'expense' (or 'incoming' vs 'outgoing'). So this one would be marked appropriately.

Attach the supplier as a Customer record (here, “customer” is a bit inverted because your company is actually the customer of the supplier, but in KSięgaI’s data model, the invoice’s customer field would hold the counterparty of the invoice. For your incoming invoices, the “customer” field might actually be used for the supplier – or they might choose to treat incoming invoices differently. The existing model seems to assume business_profile is seller and customer is buyer, which flips in an incoming invoice. They might represent both types in one table with a flag).

Store the KSeF reference number of that invoice in the ksef_reference_number field, and probably mark ksef_status as "received" or similar.

Possibly store a link to the original XML or a copy of it for audit. At minimum, having the KSeF ID means you can always re-fetch if needed.

KSięgaI likely will also create an associated Event for this invoice (for accounting). For instance, a purchase_invoice_received event could be logged, and the invoice might need to go through an approval step by the accountant (to confirm the expense is legitimate and maybe assign it to accounts). The earlier mention in the Mock KSeF doc about events for incoming invoices > 15k PLN requiring KSeF reference suggests that an event is created when a purchase invoice is recorded, and it was blocked if no KSeF reference. After integration, that blocker will be meaningful: if someone tries to record a large expense invoice manually, the system might demand a KSeF ID (ensuring no unreported invoice is booked). But once we are pulling from KSeF, every such invoice will naturally have a reference, satisfying that requirement.

User Interface for Incoming Invoices: KSięgaI will need to present these fetched invoices to the user. Perhaps there will be an “Received Invoices” list or incorporate them into the main Invoices list with a filter. The README hints at a tab for “Otrzymane” (received) documents for shared invoices – KSeF fetched invoices could appear there. The app can highlight them as new/unread for the accountant to process. Just as in the SAP example, KSięgaI could have statuses like “New (unprocessed)”, “Reviewed”, “Booked” for incoming invoices. At minimum, the accountant might open the invoice, verify its contents, maybe attach it to an expense claim or mark it for payment. The system could allow adding an entry to accounts payable or linking the invoice to a payment record.

Automated Fetch vs Manual: Ideally, KSięgaI will automate this. For instance, each morning it could pull any new invoices. Alternatively, a manual “Sync KSeF” button could trigger the fetch. The Crowe article suggests integration can automatically check and download new invoices periodically, so the user doesn’t have to remember to do it. Notifications could be added – e.g., “3 new invoices were fetched from KSeF”.

Example (Gas Station Invoice): Let’s walk through your example to solidify it: You refuel at a gas station in March 2026. You provide your company’s NIP to get an invoice. The gas station’s system creates the invoice and sends it to KSeF (instead of printing a paper or emailing you). KSeF validates it and assigns an ID. Now, your company is listed as buyer (with your NIP) on that invoice in KSeF. Later that day or the next, your KSięgaI app’s integration queries KSeF and finds “Invoice #XYZ from Shell, date 2026-03-10, to NIP [Your NIP]”. The app downloads it. Your accountant logs into KSięgaI and sees a new invoice from Shell in the Received Invoices section. They can open it (perhaps KSięgaI will render it nicely, using either the same PDF generator but in reverse or by using a provided PDF from KSeF – note: KSeF doesn’t give a PDF, but ksefapi mentioned generating PDF preview with QR code, which might be a value-add of third-party services). The accountant can then accept it into the books, maybe click “Approve” (which could trigger an invoice_approved event and eventually mark it as posted into expenses).

All of this happened without the gas station emailing or mailing anything – it’s instantaneous and centralized. The benefit is clear: no lost invoices, immediate availability. And yes, your understanding is correct: if properly implemented, your accountant should automatically receive the invoice through KSeF, essentially right after it’s issued.

Edge cases: If your company doesn’t integrate, the fallback is to log into the KSeF government portal with your credentials and manually download the invoice (e.g., as an XML or view it as a human-readable form). But that’s cumbersome at scale. With KSięgaI integration, it’s hands-free after initial setup.

Technical challenges for receiving: Implementing the above means KSięgaI needs additional capabilities:

An endpoint to list/filter invoices. Possibly KSeF’s API has something like GET /api/search where you provide criteria (your NIP as buyer, date range). The third-party ksefapi indicates these operations exist (search by sales or cost, bulk download).

Parsing XML, which KSięgaI can do either on the client or (better) on the server side (Supabase Functions). Likely a Supabase function could fetch and return data to the app, which then saves it. Or the server function might directly insert into the DB using the service role.

Avoiding duplicates: The app should track which invoices it has fetched (maybe store the last fetch timestamp or maintain a log of KSeF IDs seen).

Handling authorizations: The user might need to input the token into KSięgaI’s settings. Security is key – that token is like a password to your company’s invoices, so it must be stored safely (Supabase secret or encrypted). Possibly, they’ll integrate a flow where you authenticate via KSeF once to grant KSięgaI an access token.